import os
import sys
import base64

def write_file_b64(filepath, b64_content):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    content = base64.b64decode(b64_content.encode('utf-8'))
    with open(filepath, 'wb') as f:
        f.write(content)
    print(f"Created: {filepath}")

def strip_bom(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'rb') as f:
            d = f.read()
        if d.startswith(b'\xef\xbb\xbf'):
            with open(filepath, 'wb') as f:
                f.write(d[3:])
            print(f"Stripped BOM: {filepath}")

if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == '--strip-bom':
        strip_bom(sys.argv[2])
    elif len(sys.argv) >= 3:
        write_file_b64(sys.argv[1], sys.argv[2])
