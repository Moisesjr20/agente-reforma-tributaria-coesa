"""
Testes unitários — update_knowledge_base.py
Runner: python -m pytest execution/rag-reforma/test_update_knowledge_base.py -v

Cobre apenas funções puras (sem rede, sem chaves de API).
"""

import sys
from pathlib import Path

# Garante que o módulo é encontrado quando rodamos da raiz do projeto
sys.path.insert(0, str(Path(__file__).parent))

import unittest
import tempfile

# Importar as funções testáveis diretamente
from update_knowledge_base import (
    _HTMLTextExtractor,
    split_into_chunks,
    content_hash,
    extract_text_from_txt,
    extract_text_from_html,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)


# ---------------------------------------------------------------------------
# _HTMLTextExtractor
# ---------------------------------------------------------------------------

class TestHTMLTextExtractor(unittest.TestCase):

    def _extract(self, html: str) -> str:
        e = _HTMLTextExtractor()
        e.feed(html)
        return e.get_text()

    def test_extrai_texto_simples(self):
        result = self._extract("<p>Olá mundo</p>")
        self.assertIn("Olá mundo", result)

    def test_remove_tags_script(self):
        result = self._extract("<script>alert('xss')</script><p>visível</p>")
        self.assertNotIn("alert", result)
        self.assertIn("visível", result)

    def test_remove_tags_style(self):
        result = self._extract("<style>body{color:red}</style><p>texto</p>")
        self.assertNotIn("color", result)
        self.assertIn("texto", result)

    def test_remove_tags_head(self):
        result = self._extract("<head><title>Título</title></head><body><p>body</p></body>")
        self.assertNotIn("Título", result)
        self.assertIn("body", result)

    def test_multiplos_paragrafos_separados_por_espaco(self):
        result = self._extract("<p>Artigo 1</p><p>Artigo 2</p>")
        self.assertIn("Artigo 1", result)
        self.assertIn("Artigo 2", result)

    def test_html_vazio_retorna_string_vazia(self):
        result = self._extract("")
        self.assertEqual(result, "")

    def test_so_tags_sem_texto_retorna_vazio(self):
        result = self._extract("<div><span></span></div>")
        self.assertEqual(result, "")

    def test_script_aninhado_em_div_e_removido(self):
        result = self._extract("<div><script>malicious()</script><p>ok</p></div>")
        self.assertNotIn("malicious", result)
        self.assertIn("ok", result)


# ---------------------------------------------------------------------------
# split_into_chunks
# ---------------------------------------------------------------------------

class TestSplitIntoChunks(unittest.TestCase):

    def test_texto_menor_que_chunk_size_retorna_um_chunk(self):
        text = "A" * (CHUNK_SIZE - 1)
        chunks = split_into_chunks(text)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0], text)

    def test_texto_igual_ao_chunk_size_retorna_um_chunk(self):
        text = "B" * CHUNK_SIZE
        chunks = split_into_chunks(text)
        self.assertEqual(len(chunks), 1)

    def test_texto_maior_gera_multiplos_chunks(self):
        text = "C" * (CHUNK_SIZE * 2)
        chunks = split_into_chunks(text)
        self.assertGreater(len(chunks), 1)

    def test_cada_chunk_nao_excede_chunk_size(self):
        text = "D" * (CHUNK_SIZE * 3 + 50)
        for chunk in split_into_chunks(text):
            self.assertLessEqual(len(chunk), CHUNK_SIZE)

    def test_overlap_faz_chunks_consecutivos_se_sobreporem(self):
        # Com overlap, o início do chunk N+1 deve aparecer no final do chunk N
        text = "X" * CHUNK_SIZE + "Y" * CHUNK_SIZE
        chunks = split_into_chunks(text)
        if len(chunks) >= 2:
            # a sobreposição é CHUNK_OVERLAP chars de conteúdo "X" no início do chunk 1
            tail_of_0 = chunks[0][-CHUNK_OVERLAP:]
            head_of_1 = chunks[1][:CHUNK_OVERLAP]
            self.assertEqual(tail_of_0, head_of_1)

    def test_texto_vazio_retorna_lista_vazia(self):
        self.assertEqual(split_into_chunks(""), [])

    def test_texto_so_espacos_retorna_lista_vazia(self):
        self.assertEqual(split_into_chunks("   \n\t  "), [])


# ---------------------------------------------------------------------------
# content_hash
# ---------------------------------------------------------------------------

class TestContentHash(unittest.TestCase):

    def test_mesmo_texto_mesmo_hash(self):
        self.assertEqual(content_hash("abc"), content_hash("abc"))

    def test_textos_diferentes_hashes_diferentes(self):
        self.assertNotEqual(content_hash("abc"), content_hash("abd"))

    def test_retorna_string_hexadecimal(self):
        h = content_hash("qualquer texto")
        self.assertRegex(h, r"^[0-9a-f]{32}$")


# ---------------------------------------------------------------------------
# extract_text_from_txt
# ---------------------------------------------------------------------------

class TestExtractTextFromTxt(unittest.TestCase):

    def test_le_arquivo_utf8(self):
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", suffix=".txt", delete=False) as f:
            f.write("  Artigo 1 — IBS  \n")
            path = Path(f.name)
        result = extract_text_from_txt(path)
        self.assertEqual(result, "Artigo 1 — IBS")
        path.unlink()

    def test_le_arquivo_latin1(self):
        with tempfile.NamedTemporaryFile(mode="wb", suffix=".txt", delete=False) as f:
            f.write("conteúdo em latin-1".encode("latin-1"))
            path = Path(f.name)
        result = extract_text_from_txt(path)
        self.assertIn("conte", result)
        path.unlink()

    def test_arquivo_inexistente_retorna_string_vazia(self):
        result = extract_text_from_txt(Path("/nao/existe/arquivo.txt"))
        self.assertEqual(result, "")


# ---------------------------------------------------------------------------
# extract_text_from_html (integração leve — sem arquivo real)
# ---------------------------------------------------------------------------

class TestExtractTextFromHtml(unittest.TestCase):

    def test_le_html_utf8_e_extrai_texto(self):
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", suffix=".html", delete=False) as f:
            f.write("<html><body><h1>Reforma Tributária</h1><p>LC 214/2025</p></body></html>")
            path = Path(f.name)
        result = extract_text_from_html(path)
        self.assertIn("Reforma Tributária", result)
        self.assertIn("LC 214/2025", result)
        path.unlink()


if __name__ == "__main__":
    unittest.main()
