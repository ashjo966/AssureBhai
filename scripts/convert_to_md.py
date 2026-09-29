import sys
import os

# Ensure standard output and standard error use utf-8 encoding across Windows, Linux, and macOS
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

def extract_with_markitdown(file_path):
    try:
        from markitdown import MarkItDown
        md = MarkItDown()
        result = md.convert(file_path)
        if result and result.text_content and len(result.text_content.strip()) > 20:
            return result.text_content
    except Exception as e:
        sys.stderr.write(f"MarkItDown primary extraction failed: {e}\n")
    return None

def extract_with_pypdf(file_path):
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        text_parts = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
        combined = "\n\n".join(text_parts)
        if len(combined.strip()) > 20:
            return combined
    except Exception as e:
        sys.stderr.write(f"pypdf extraction failed: {e}\n")
    return None

def extract_with_pdfminer(file_path):
    try:
        from pdfminer.high_level import extract_text
        text = extract_text(file_path)
        if text and len(text.strip()) > 20:
            return text
    except Exception as e:
        sys.stderr.write(f"pdfminer extraction failed: {e}\n")
    return None

def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python convert_to_md.py <file_path>\n")
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.isabs(file_path):
        file_path = os.path.abspath(file_path)

    if not os.path.exists(file_path):
        sys.stderr.write(f"File not found: {file_path}\n")
        sys.exit(1)

    # 1. Try MarkItDown
    text = extract_with_markitdown(file_path)

    # 2. Fallback to pypdf
    if not text:
        text = extract_with_pypdf(file_path)

    # 3. Fallback to pdfminer
    if not text:
        text = extract_with_pdfminer(file_path)

    if text:
        sys.stdout.write(text)
    else:
        sys.stderr.write("All text extraction methods produced empty output.\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
