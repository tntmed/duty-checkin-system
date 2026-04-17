import oracledb

oracledb.init_oracle_client(lib_dir=r"C:\oracle\instantclient_23_0")

conn = oracledb.connect(
    user="C##KASOM",
    password="Oracle123",
    dsn="191.123.95.35:1521/xepdb1"
)
cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM date_dbfs WHERE ROWNUM = 1")
print("สำเร็จ! ผล:", cursor.fetchone())
conn.close()
