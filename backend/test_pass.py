import sys, os
sys.path.insert(0, '.')
os.environ['DATABASE_URL'] = 'sqlite:///test_pass.db'
from app.routers.auth import hash_password, verify_password
h = hash_password('dgduhrt')
print(f'Hash OK: {verify_password("dgduhrt", h)}')
os.remove('test_pass.db') if os.path.exists('test_pass.db') else None
os.remove('test_pass.db-wal') if os.path.exists('test_pass.db-wal') else None
os.remove('test_pass.db-shm') if os.path.exists('test_pass.db-shm') else None
print('Done')
