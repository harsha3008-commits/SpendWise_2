# Fix all regex patterns in models.py

import re

def fix_regex_patterns():
    with open('/app/backend/models.py', 'r') as f:
        content = f.read()
    
    # Replace all regex= with pattern=
    content = re.sub(r'regex=', 'pattern=', content)
    
    with open('/app/backend/models.py', 'w') as f:
        f.write(content)
    
    print("Fixed all regex patterns in models.py")

if __name__ == "__main__":
    fix_regex_patterns()