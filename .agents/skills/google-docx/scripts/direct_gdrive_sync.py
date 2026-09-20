import os
import sys
import json
import time
import base64
import urllib.request
import urllib.parse
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def get_access_token(service_account_path: str) -> str:
    with open(service_account_path, 'r', encoding='utf-8') as f:
        sa_data = json.load(f)

    client_email = sa_data['client_email']
    private_key_pem = sa_data['private_key'].encode('utf-8')
    token_uri = sa_data.get('token_uri', 'https://oauth2.googleapis.com/token')

    now = int(time.time())
    header = {"alg": "RS256", "typ": "JWT"}
    payload = {
        "iss": client_email,
        "scope": "https://www.googleapis.com/auth/drive",
        "aud": token_uri,
        "exp": now + 3600,
        "iat": now
    }

    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload).encode('utf-8'))
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')

    private_key = load_pem_private_key(private_key_pem, password=None)
    signature = private_key.sign(
        signing_input,
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    sig_b64 = base64url_encode(signature)
    jwt_assertion = f"{header_b64}.{payload_b64}.{sig_b64}"

    post_data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": jwt_assertion
    }).encode('utf-8')

    req = urllib.request.Request(token_uri, data=post_data, headers={
        "Content-Type": "application/x-www-form-urlencoded"
    })

    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return res['access_token']

def sync_to_google_drive(file_id: str, docx_path: str, sa_path: str):
    print(f"🔑 Generating OAuth2 access token for Service Account...")
    token = get_access_token(sa_path)
    print("✅ Access token generated successfully!")

    # 1. Check file metadata
    print(f"🔍 Fetching Google Drive metadata for file: {file_id}...")
    meta_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=id,name,mimeType,capabilities"
    req_meta = urllib.request.Request(meta_url, headers={
        "Authorization": f"Bearer {token}"
    })

    try:
        with urllib.request.urlopen(req_meta) as resp:
            meta = json.loads(resp.read().decode('utf-8'))
            print(f"✅ Found Cloud Document: '{meta.get('name')}' (MIME: {meta.get('mimeType')})")
            can_edit = meta.get('capabilities', {}).get('canEdit', False)
            print(f"📝 Permission Check -> Can Edit: {can_edit}")
            if not can_edit:
                print("⚠️ CẢNH BÁO: Service account chưa có quyền Editor! Vui lòng bấm Share -> Editor trên Google Doc.")
                return False
    except urllib.error.HTTPError as e:
        print(f"❌ Error fetching metadata: {e.code} - {e.read().decode('utf-8')}")
        return False

    # 2. Upload and overwrite file binary directly
    print(f"🚀 Directly overwriting binary content to Google Docs file: {file_id}...")
    upload_url = f"https://www.googleapis.com/upload/drive/v3/files/{file_id}?uploadType=media"

    with open(docx_path, 'rb') as f:
        file_bytes = f.read()

    req_upload = urllib.request.Request(upload_url, data=file_bytes, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": meta.get('mimeType', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    }, method='PATCH')

    try:
        with urllib.request.urlopen(req_upload) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            print("\n" + "="*60)
            print("🎉 GHI ĐÈ THÀNH CÔNG 100% TRỰC TIẾP LÊN LINK GOOGLE DOCS!")
            print(f"📄 Tên file trên Cloud: {result.get('name')}")
            print(f"🆔 File ID: {result.get('id')}")
            print(f"🔗 Link Google Docs: https://docs.google.com/document/d/{file_id}/edit")
            print("="*60 + "\n")
            return True
    except urllib.error.HTTPError as e:
        print(f"❌ Error updating document: {e.code} - {e.read().decode('utf-8')}")
        return False

if __name__ == '__main__':
    FILE_ID = '1k0Ke_mOGq9Rp_1sDgM1LIlq_jgqQMAGA'
    DOCX_FILE = 'docs/Report5_Test_Documentation_Updated.docx'
    SA_FILE = 'service_account.json'
    sync_to_google_drive(FILE_ID, DOCX_FILE, SA_FILE)
