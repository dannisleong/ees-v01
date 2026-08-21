import re

with open('package.json', 'rb') as f:
    content = f.read()

old = b'    "dev": "vite",'
new = b'    "dev": "node dev-start.mjs",'

if old in content:
    content = content.replace(old, new)
    with open('package.json', 'wb') as f:
        f.write(content)
    print('Updated dev script successfully')
else:
    print('Pattern not found, trying alternate...')
    # Try with different whitespace
    old2 = b'"dev": "vite"'
    new2 = b'"dev": "node dev-start.mjs"'
    if old2 in content:
        content = content.replace(old2, new2)
        with open('package.json', 'wb') as f:
            f.write(content)
        print('Updated dev script (alternate match)')
    else:
        print('ERROR: Could not find dev script pattern')
