#!/bin/bash

# do some checking if this is a raspberry
if ! raspi-config nonint is_pifour; then
  echo "Only Raspberry Pi 4 models are supprted!"
  exit 1
fi

# check for root
if (( $EUID != 0 )); then
    echo "Please run as root"
    exit
fi

# backup /boot/config.txt
cp /boot/config.txt /boot/config.bak

# activate legacy camera interface on Bullseye and disable libcamera
read -d . VERSION < /etc/debian_version
if [ $VERSION  -eq 11 ]; then
   echo "Install LilScan on Bullseye"
   echo "Disable libcamera and activate legacy camera mode"
   sed -i 's/^camera_auto_detect=\?/#&/g' /boot/config.txt
elif [ $VERSION  -eq 10 ]; then
  echo "Install LilScan on Buster"
else
  echo "Only Buster or Bullseye are supported. Update your Raspberry Pi"
  exit 1
fi

# enable camera module
sed -i  's/^\(start_x=\).*$/\11/g' /boot/config.txt
grep -qxF 'start_x=1' /boot/config.txt || echo 'start_x=1' >> /boot/config.txt

# set gpu memory
sed -i  's/^\(gpu_mem=\).*$/\1256/g' /boot/config.txt
grep -qxF 'gpu_mem=256' /boot/config.txt || echo 'gpu_mem=256' >> /boot/config.txt

# enable i2c for raw camera access
sed -i  's/^\(dtparam=i2c_vc=\).*$/\1on/g' /boot/config.txt
grep -qxF 'dtparam=i2c_vc=on' /boot/config.txt || echo 'dtparam=i2c_vc=on' >> /boot/config.txt

# enable additional ports
raspi-config nonint do_serial 1
raspi-config nonint do_i2c 1

# install software
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get -y install pigpio snapd
systemctl enable pigpiod
systemctl start pigpiod

# install snap
snap install lilscan --devmode

# reboot if config.txt has changed
cmp --silent /boot/config.txt /boot/config.bak || (echo "reboot system" && reboot)