#!/bin/bash

###########################################
user=hien
###########################################

ipwan=$(curl ipinfo.io/ip)
dns=$(host -t a cretacam.ddns.net)

for i in $dns; do
	if [ $i = $ipwan ]; then
		host=192.168.1.199
		portssh=22
	else
		host=cretacam.ddns.net
		portssh=2222
	fi
done

port=33199
ftpuser=creta
dir_upload=Desktop/application/storage
passid=yoursolution
echo "Hi, Black"
echo "WELCOME TO SERVER CRETA"
#echo -n "User: "; read user
pass=1

while [ : ]; do
	echo "\n================================"
	echo "[1]. Download source from server"
	echo "[2]. Upload source to server"
	echo "[3]. Install new package"
	echo "[q]. Exit"
	echo "================================"
	echo -n "Command > "
	read req
#Download source from server
	if [ $req = 1 ]; then
		echo "Program will replace all file source. You could miss data?."
		echo -n "Please input password: "
		read iPass
		if [ $iPass = $passid ]; then
			json={\"user\":\"$user\",\"pass\":\"$pass\",\"cmd\":\"download\"}
			curl -H "Content-Type: application/json" -X POST -d "$json" http://$host:$port/devel
			wget $host:$port/download/$user
			tar xzvf $user
			rm $user
		else 
			echo "Password error!\n\n"
		fi
#Upload source to server code
	elif [ $req = 2 ]; then
		tar czvf $user.tar public/$user views/$user route/$user
		chmod 777 $user.tar
		scp -P $portssh $user.tar black@$host:~/application/storage 
		rm $user.tar
		json={\"user\":\"$user\",\"pass\":\"$pass\",\"cmd\":\"upload\"}
		curl -H "Content-Type: application/json" -X POST -d "$json" http://$host:$port/devel

#install package
	elif [ $req = 3 ]; then
		echo -n Package:
		read package
		json={\"user\":\"$user\",\"pass\":\"$pass\",\"cmd\":\"install\",\"dat\":\"$package\"}
		curl -H "Content-Type: application/json" -X POST -d "$json" http://$host:$port/devel

#Exit program
	elif [ $req = q ]; then
		echo goodbye
		exit 0
	else 
		echo not found
	fi

done
