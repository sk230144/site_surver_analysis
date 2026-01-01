import psycopg

conn = psycopg.connect(
    dbname='solar_platform',
    user='solar',
    password='solar123',
    host='localhost',
    port=5432
)
cur = conn.cursor()

# Create new test project
cur.execute('''
    INSERT INTO projects (name, address, status, created_at)
    VALUES ('Shading Test House', '1600 Amphitheatre Parkway, Mountain View, CA', 'active', NOW())
    RETURNING id
''')
project_id = cur.fetchone()[0]

conn.commit()
print(f'Created project ID: {project_id}')
print(f'Geometry URL: http://localhost:3000/projects/{project_id}/geometry')

cur.close()
conn.close()
