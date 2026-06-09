"""
Testes unitários — crawler_watchdog.py

Cobertura:
  - compute_hash              → determinismo e sensibilidade a mudanças
  - discover_pdf_links        → parse HTML, filtro por domínio, geração de slug
  - discover_subpage_links    → links internos, exclui PDFs e página raiz
  - run_html_direct           → sem mudança (skip), com mudança, dry-run
  - ingest_text (dry-run)     → retorna nº de chunks sem inserir
  - _now                      → formato ISO 8601
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent))
from crawler_watchdog import (
    _now,
    compute_hash,
    discover_pdf_links,
    discover_subpage_links,
    ingest_text,
    run_html_direct,
)


# ---------------------------------------------------------------------------
# compute_hash
# ---------------------------------------------------------------------------

class TestComputeHash:
    def test_deterministic(self):
        data = b"conteudo da lei complementar 214"
        assert compute_hash(data) == compute_hash(data)

    def test_different_content_different_hash(self):
        assert compute_hash(b"versao 1") != compute_hash(b"versao 2")

    def test_empty_bytes(self):
        h = compute_hash(b"")
        assert isinstance(h, str) and len(h) == 64  # SHA-256 hex

    def test_returns_sha256_hex(self):
        h = compute_hash(b"test")
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)


# ---------------------------------------------------------------------------
# discover_pdf_links
# ---------------------------------------------------------------------------

HTML_WITH_PDFS = """
<html><body>
  <a href="/docs/resolucao-001.pdf">Resolução 001</a>
  <a href="/docs/resolucao-002.pdf">Resolução 002</a>
  <a href="https://outro.dominio.gov.br/fora.pdf">Externo — deve ser ignorado</a>
  <a href="/pagina-interna">Página interna — não é PDF</a>
  <a href="/docs/resolucao-001.pdf">Duplicada — deve ser ignorada</a>
</body></html>
"""

class TestDiscoverPdfLinks:
    def test_finds_pdfs_on_same_domain(self):
        links = discover_pdf_links(
            HTML_WITH_PDFS,
            "https://consumo.tributos.gov.br/",
            "consumo.tributos.gov.br",
        )
        assert len(links) == 2

    def test_excludes_external_domain(self):
        links = discover_pdf_links(
            HTML_WITH_PDFS,
            "https://consumo.tributos.gov.br/",
            "consumo.tributos.gov.br",
        )
        assert all("outro.dominio" not in l["url"] for l in links)

    def test_deduplicates_same_url(self):
        links = discover_pdf_links(
            HTML_WITH_PDFS,
            "https://consumo.tributos.gov.br/",
            "consumo.tributos.gov.br",
        )
        urls = [l["url"] for l in links]
        assert len(urls) == len(set(urls))

    def test_slug_is_kebab_case(self):
        links = discover_pdf_links(
            HTML_WITH_PDFS,
            "https://consumo.tributos.gov.br/",
            "consumo.tributos.gov.br",
        )
        for l in links:
            assert " " not in l["slug"]
            assert "_" not in l["slug"]
            assert l["slug"].startswith("portal-cgibs-")

    def test_uses_anchor_text_as_title(self):
        links = discover_pdf_links(
            HTML_WITH_PDFS,
            "https://consumo.tributos.gov.br/",
            "consumo.tributos.gov.br",
        )
        titles = [l["title"] for l in links]
        assert "Resolução 001" in titles

    def test_empty_page_returns_empty_list(self):
        links = discover_pdf_links("<html><body></body></html>",
                                   "https://consumo.tributos.gov.br/",
                                   "consumo.tributos.gov.br")
        assert links == []


# ---------------------------------------------------------------------------
# discover_subpage_links
# ---------------------------------------------------------------------------

HTML_WITH_SUBPAGES = """
<html><body>
  <a href="/resolucoes/">Resoluções</a>
  <a href="/faq/">FAQ</a>
  <a href="/docs/arquivo.pdf">PDF — deve ser ignorado</a>
  <a href="https://externo.gov.br/">Externo — deve ser ignorado</a>
</body></html>
"""

class TestDiscoverSubpageLinks:
    def test_finds_internal_pages(self):
        links = discover_subpage_links(
            HTML_WITH_SUBPAGES,
            "https://consumo.tributos.gov.br/",
            "consumo.tributos.gov.br",
        )
        assert len(links) == 2

    def test_excludes_pdf_links(self):
        links = discover_subpage_links(
            HTML_WITH_SUBPAGES,
            "https://consumo.tributos.gov.br/",
            "consumo.tributos.gov.br",
        )
        assert all(not l.endswith(".pdf") for l in links)

    def test_excludes_external_links(self):
        links = discover_subpage_links(
            HTML_WITH_SUBPAGES,
            "https://consumo.tributos.gov.br/",
            "consumo.tributos.gov.br",
        )
        assert all("externo.gov.br" not in l for l in links)


# ---------------------------------------------------------------------------
# _now
# ---------------------------------------------------------------------------

class TestNow:
    def test_returns_iso_string(self):
        n = _now()
        assert "T" in n  # ISO 8601 separator
        assert "+" in n or "Z" in n or n.endswith("+00:00")


# ---------------------------------------------------------------------------
# ingest_text (dry-run — sem chamadas ao banco)
# ---------------------------------------------------------------------------

class TestIngestTextDryRun:
    def test_dry_run_returns_chunk_count_without_insertion(self):
        text = "a" * 3000  # ~3 chunks de 1000 chars
        mock_openai   = MagicMock()
        mock_supabase = MagicMock()

        count = ingest_text(
            text, "test-slug", "Test Title", "lei",
            mock_openai, mock_supabase, dry_run=True,
        )

        assert count >= 1
        mock_openai.embeddings.create.assert_not_called()
        mock_supabase.table.assert_not_called()

    def test_empty_text_returns_zero_chunks(self):
        mock_openai   = MagicMock()
        mock_supabase = MagicMock()

        count = ingest_text(
            "", "test-slug", "Test Title", "lei",
            mock_openai, mock_supabase, dry_run=True,
        )
        assert count == 0


# ---------------------------------------------------------------------------
# run_html_direct
# ---------------------------------------------------------------------------

class TestRunHtmlDirect:
    SOURCE = {
        "url": "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm",
        "slug": "lcp-214",
        "title": "Lei Complementar 214/2025",
        "source_type": "lei",
        "strategy": "html_direct",
    }

    HTML_CONTENT = b"<html><body><p>Art. 1 Esta lei complementar institui o IBS e a CBS.</p></body></html>"

    @patch("crawler_watchdog.fetch_url")
    def test_skip_when_hash_unchanged(self, mock_fetch):
        mock_resp      = MagicMock()
        mock_resp.content = self.HTML_CONTENT
        mock_resp.text    = self.HTML_CONTENT.decode()
        mock_fetch.return_value = mock_resp

        existing_hash = compute_hash(self.HTML_CONTENT)
        state         = {"content_hash": existing_hash}

        result = run_html_direct(
            self.SOURCE, state,
            MagicMock(), MagicMock(),
            dry_run=False, force=False,
        )
        assert result["status"] == "ok_no_change"
        assert result["chunks"] == 0

    @patch("crawler_watchdog.fetch_url")
    def test_ingest_when_hash_changed(self, mock_fetch):
        mock_resp         = MagicMock()
        mock_resp.content = self.HTML_CONTENT
        mock_resp.text    = self.HTML_CONTENT.decode()
        mock_fetch.return_value = mock_resp

        state = {"content_hash": "hash-antigo-diferente"}

        with patch("crawler_watchdog.ingest_text", return_value=5) as mock_ingest:
            result = run_html_direct(
                self.SOURCE, state,
                MagicMock(), MagicMock(),
                dry_run=False, force=False,
            )

        assert result["status"] == "ok_updated"
        assert result["chunks"] == 5
        mock_ingest.assert_called_once()

    @patch("crawler_watchdog.fetch_url")
    def test_ok_new_when_no_prior_state(self, mock_fetch):
        mock_resp         = MagicMock()
        mock_resp.content = self.HTML_CONTENT
        mock_resp.text    = self.HTML_CONTENT.decode()
        mock_fetch.return_value = mock_resp

        with patch("crawler_watchdog.ingest_text", return_value=3):
            result = run_html_direct(
                self.SOURCE, None,
                MagicMock(), MagicMock(),
                dry_run=False, force=False,
            )

        assert result["status"] == "ok_new"

    @patch("crawler_watchdog.fetch_url")
    def test_force_flag_bypasses_hash_check(self, mock_fetch):
        mock_resp         = MagicMock()
        mock_resp.content = self.HTML_CONTENT
        mock_resp.text    = self.HTML_CONTENT.decode()
        mock_fetch.return_value = mock_resp

        existing_hash = compute_hash(self.HTML_CONTENT)
        state         = {"content_hash": existing_hash}

        with patch("crawler_watchdog.ingest_text", return_value=4) as mock_ingest:
            result = run_html_direct(
                self.SOURCE, state,
                MagicMock(), MagicMock(),
                dry_run=False, force=True,
            )

        assert result["status"] != "ok_no_change"
        mock_ingest.assert_called_once()

    @patch("crawler_watchdog.fetch_url")
    def test_dry_run_does_not_insert(self, mock_fetch):
        mock_resp         = MagicMock()
        mock_resp.content = self.HTML_CONTENT
        mock_resp.text    = self.HTML_CONTENT.decode()
        mock_fetch.return_value = mock_resp

        mock_supabase = MagicMock()

        run_html_direct(
            self.SOURCE, None,
            MagicMock(), mock_supabase,
            dry_run=True, force=False,
        )

        mock_supabase.table.assert_not_called()
