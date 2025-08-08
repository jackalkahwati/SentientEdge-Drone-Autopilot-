#!/bin/bash

# SSL Certificate Generation Script for PostgreSQL
# Generates CA, server, and client certificates for secure database connections

set -e

CERT_DIR="$(dirname "$0")"
DAYS=3650  # 10 years
KEY_SIZE=4096

echo "🔐 Generating SSL certificates for PostgreSQL..."

# Create CA private key
echo "📄 Generating CA private key..."
openssl genrsa -out "${CERT_DIR}/ca.key" ${KEY_SIZE}
chmod 600 "${CERT_DIR}/ca.key"

# Create CA certificate
echo "📄 Generating CA certificate..."
openssl req -new -x509 -key "${CERT_DIR}/ca.key" -out "${CERT_DIR}/ca.crt" -days ${DAYS} -subj "/C=US/ST=CA/L=Los Angeles/O=SentientEdge/OU=Database/CN=SentientEdge-CA"

# Create server private key
echo "📄 Generating server private key..."
openssl genrsa -out "${CERT_DIR}/server.key" ${KEY_SIZE}
chmod 600 "${CERT_DIR}/server.key"

# Create server certificate signing request
echo "📄 Generating server certificate signing request..."
openssl req -new -key "${CERT_DIR}/server.key" -out "${CERT_DIR}/server.csr" -subj "/C=US/ST=CA/L=Los Angeles/O=SentientEdge/OU=Database/CN=localhost"

# Create server certificate extensions
cat > "${CERT_DIR}/server.ext" << EOF
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=@alt_names

[alt_names]
DNS.1=localhost
DNS.2=postgres-primary
DNS.3=postgres-replica
DNS.4=sentient-edge-postgres-primary
DNS.5=sentient-edge-postgres-replica
IP.1=127.0.0.1
IP.2=::1
EOF

# Sign server certificate
echo "📄 Signing server certificate..."
openssl x509 -req -in "${CERT_DIR}/server.csr" -CA "${CERT_DIR}/ca.crt" -CAkey "${CERT_DIR}/ca.key" -CAcreateserial -out "${CERT_DIR}/server.crt" -days ${DAYS} -extensions v3_req -extfile "${CERT_DIR}/server.ext"

# Create client private key
echo "📄 Generating client private key..."
openssl genrsa -out "${CERT_DIR}/client.key" ${KEY_SIZE}
chmod 600 "${CERT_DIR}/client.key"

# Create client certificate signing request
echo "📄 Generating client certificate signing request..."
openssl req -new -key "${CERT_DIR}/client.key" -out "${CERT_DIR}/client.csr" -subj "/C=US/ST=CA/L=Los Angeles/O=SentientEdge/OU=Database/CN=sentient_admin"

# Create client certificate extensions
cat > "${CERT_DIR}/client.ext" << EOF
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=clientAuth
EOF

# Sign client certificate
echo "📄 Signing client certificate..."
openssl x509 -req -in "${CERT_DIR}/client.csr" -CA "${CERT_DIR}/ca.crt" -CAkey "${CERT_DIR}/ca.key" -CAcreateserial -out "${CERT_DIR}/client.crt" -days ${DAYS} -extensions v3_req -extfile "${CERT_DIR}/client.ext"

# Set proper permissions
chmod 644 "${CERT_DIR}/ca.crt"
chmod 644 "${CERT_DIR}/server.crt"
chmod 644 "${CERT_DIR}/client.crt"
chmod 600 "${CERT_DIR}/server.key"
chmod 600 "${CERT_DIR}/client.key"

# Clean up temporary files
rm -f "${CERT_DIR}/server.csr" "${CERT_DIR}/server.ext" "${CERT_DIR}/client.csr" "${CERT_DIR}/client.ext"

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificates location: ${CERT_DIR}"
echo ""
echo "Files generated:"
echo "  - ca.crt (Certificate Authority)"
echo "  - ca.key (CA Private Key)"
echo "  - server.crt (Server Certificate)"
echo "  - server.key (Server Private Key)"
echo "  - client.crt (Client Certificate)"
echo "  - client.key (Client Private Key)"
echo ""
echo "🔐 All private keys have been secured with 600 permissions"
echo "⚠️  IMPORTANT: Keep these certificates secure and back them up!"
echo ""
echo "To verify certificates:"
echo "  openssl x509 -in ${CERT_DIR}/server.crt -text -noout"
echo "  openssl x509 -in ${CERT_DIR}/client.crt -text -noout"