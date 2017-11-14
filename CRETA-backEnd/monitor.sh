#!/bin/bash

###########################################
user=hien
###########################################

ipwan=$(curl ipinfo.io/ip)
dns=$(host -t a cretacam.ddns.net)

for i in $dns; do
	if [ $i = $ipwan ]; then
		host=192.168.1.198
		port=4444
	else
		host=cretacam.ddns.net
		port=4444
	fi
done

nc $host $port
