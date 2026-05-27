import os
import sys
import json
import argparse
import subprocess

# Auto-install missing basic libs
def install_dependencies():
    packages = []
    try:
        import PyPDF2
    except ImportError:
        packages.append("pypdf2")
    try:
        import docx
    except ImportError:
        packages.append("python-docx")
    
    if packages:
        print(f"Installing required packages: {', '.join(packages)}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", *packages, "-q"])
        print("Installation complete.")

install_dependencies()

import PyPDF2
import docx

def extract_pdf_text(filepath):
    text = ""
    try:
        with open(filepath, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                t = page.extract_text()
                if t: text += t + "\n"
    except Exception as e:
        print(f"Error reading PDF {filepath}: {e}")
    return text

def extract_docx_text(filepath):
    text = ""
    try:
        doc = docx.Document(filepath)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error reading DOCX {filepath}: {e}")
    return text

def extract_resume_text(cv_path):
    ext = os.path.splitext(cv_path)[1].lower()
    text = ""
    
    if ext == ".pdf":
        text = extract_pdf_text(cv_path)
    elif ext in [".docx", ".doc"]:
        if ext == ".docx":
            text = extract_docx_text(cv_path)
        else:
            text = "[Formato .doc legado não suportado pela biblioteca nativa. Por favor, utilize .docx ou pdf]"
    return text.strip()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cv-dir", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    results = []
    print(f"Scanning directory: {args.cv_dir}")
    
    for fname in os.listdir(args.cv_dir):
        filepath = os.path.join(args.cv_dir, fname)
        if os.path.isfile(filepath) and fname.lower().endswith(('.pdf', '.docx', '.doc')):
            print(f"Extracting {fname}...")
            text = extract_resume_text(filepath)
            if text:
                results.append({
                    "arquivo": fname,
                    "conteudo_extraido": text
                })
    
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=4, ensure_ascii=False)
        
    print(f"Done. Extracted {len(results)} resumes. Output saved to {args.output}")

if __name__ == "__main__":
    main()
