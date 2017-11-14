var mysql = require('mysql');

var create = "CREATE TABLE wifarm (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), device VARCHAR(255), date VARCHAR(255), phone VARCHAR(255), addr VARCHAR(255))";
var insert = "INSERT INTO customer (id, name, sn, ipwan, iplan, status,connection,keep) VALUES (WF-027622, Tran Hieu Hien, esp000022,1.56.68.98,123.456.789.1,on,true,agv)";
var alter = "ALTER TABLE Topic ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY";
var select = "SELECT * FROM wifarm";
var where = "SELECT topic FROM Topic WHERE mkh = 'Lam'"
var like = "SELECT * FROM customers WHERE address LIKE 'S%'";
var update = "UPDATE test SET name = 'Anh Thong' WHERE name = 'Thong'";
var del = "DELETE FROM Topic WHERE name = 'esp000022'"
var drop = "DROP TABLE Topic"
var values =[
	['WF','Lam','esp000021','13/9/2017','0123456789','373/1/171L Ly Thuong Kiet, p.9, q.10'],
	['WF','Lam','esp000022','13/9/2017','0123456789','373/1/171L Ly Thuong Kiet, p.9, q.10'],
	['WF','Huy','esp000023','13/9/2017','012345789','373/1/171L Ly Thuong Kiet, p.9, q.10']
	];

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "9873215",
  database: "CRETA"
});

console.log(con.config.password)

con.connect(function(err) {
	if (err) throw err;
	console.log("Connected!");
	// con.end()
});

dev = 'esp000021'
con.query(select, function (err, results) {
	if (err) throw err;
	console.log(results);
});

