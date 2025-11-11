# Websocket Server

## Install

```bash
npm install
```

## Certificate

The project runs on HTTPS to allow camera access on mobile phones. For local development you need to create a self-signed certificate for your IP address to test the connection between devices.

1. If you don't have mkcert installed, install it from https://github.com/FiloSottile/mkcert/releases
2. Install once creating CA:
```bash
mkcert -install
```
3. Check your IP address, for example launching /frontend with npm install and npm run you can see the IP address in the console. E.g. 192.168.1.100 will be <your-ip-address>.
4. Run the following command to create a certificate for your IP address:
```bash
mkcert -cert-file cert.pem -key-file key.pem <your-ip-address>
```
5. You neet to do this only once but you should send to your phone and install the certificate - you can find it in the `%LOCALAPPDATA%\mkcert` on your Windows machine.
6. You're good to go, you can now proceed to Run section.

## Run

```bash
npm run dev
```
