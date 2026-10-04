import urllib.request

url = 'https://beldomik-backend-brwhlf6tma-ew.a.run.app/assets/index-BwCnvvcv.js'
s = urllib.request.urlopen(url, timeout=40).read().decode('utf-8', 'replace')


def esc(t: str) -> str:
    return ''.join(c if ord(c) < 128 else '\\u%04x' % ord(c) for c in t)


checks = [
    ('REMOVED tile subtitle', 'Управление платформой, модерация, пользователи'),
    ('role badge admin', 'Администратор'),
    ('role badge moderator', 'Модератор'),
    ('tile title', 'Админ-панель'),
]
for name, text in checks:
    print(f'{name:26} literal={text in s!s:5} escaped={esc(text) in s!s:5}')

print('bundle length:', len(s))
