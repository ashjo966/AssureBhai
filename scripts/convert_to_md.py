import sys
import os

# Ensure standard output and standard error use utf-8 encoding across Windows, Linux, and macOS
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

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

    try:
        from markitdown import MarkItDown
        md = MarkItDown()
        result = md.convert(file_path)
        output_text = result.text_content if result and result.text_content else ""
        sys.stdout.write(output_text)
    except Exception as e:
        sys.stderr.write(f"Error converting document with MarkItDown: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
