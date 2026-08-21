import json

with open('C:/Users/danni/Documents/kimi/workspace/ees-v01-alpha/src/i18n/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)
with open('C:/Users/danni/Documents/kimi/workspace/ees-v01-alpha/src/i18n/zh-CN.json', 'r', encoding='utf-8') as f:
    zh = json.load(f)

def get_keys(obj, prefix=''):
    keys = []
    for k, v in obj.items():
        if isinstance(v, dict):
            keys.extend(get_keys(v, prefix + k + '.'))
        else:
            keys.append(prefix + k)
    return keys

en_keys = set(get_keys(en))
zh_keys = set(get_keys(zh))

missing_zh = en_keys - zh_keys
missing_en = zh_keys - en_keys

print('EN keys:', len(en_keys))
print('ZH keys:', len(zh_keys))
if missing_zh:
    print('Missing in ZH:', sorted(missing_zh))
if missing_en:
    print('Missing in EN:', sorted(missing_en))
if not missing_zh and not missing_en:
    print('All keys match between EN and ZH')
