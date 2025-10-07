from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import json
import base64
from datetime import datetime
from werkzeug.datastructures import FileStorage
from io import BytesIO

app = Flask(__name__)
CORS(app)

# Store for temporary file handling
temp_files = {}

@app.route('/')
def home():
    return jsonify({"message": "Text Editor API is running"})

@app.route('/api/save', methods=['POST'])
def save_file():
    try:
        data = request.json
        filename = data.get('filename', f'document_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt')
        content = data.get('content', '')
        
        # Ensure filename ends with .txt
        if not filename.endswith('.txt'):
            filename += '.txt'
        
        # For Netlify, we'll return the content as base64 for download
        content_bytes = content.encode('utf-8')
        content_b64 = base64.b64encode(content_bytes).decode('utf-8')
        
        # Store file info (in memory for serverless)
        file_id = len(temp_files)
        temp_files[file_id] = {
            'filename': filename,
            'content': content,
            'content_b64': content_b64
        }
        
        return jsonify({
            'success': True, 
            'message': 'File saved successfully',
            'filename': filename,
            'file_id': file_id,
            'download_url': f'/api/download/{file_id}'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/download/<int:file_id>')
def download_file(file_id):
    try:
        if file_id in temp_files:
            file_info = temp_files[file_id]
            
            # Return file content with proper headers for download
            response = app.response_class(
                response=file_info['content'],
                status=200,
                mimetype='text/plain',
                headers={
                    'Content-Disposition': f'attachment; filename="{file_info["filename"]}"',
                    'Content-Type': 'text/plain; charset=utf-8'
                }
            )
            return response
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/load', methods=['POST'])
def load_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        if file and file.filename.endswith('.txt'):
            content = file.read().decode('utf-8')
            return jsonify({
                'success': True,
                'content': content,
                'filename': file.filename
            })
        else:
            return jsonify({'success': False, 'message': 'Please select a .txt file'}), 400
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Netlify Functions handler
def handler(event, context):
    import io
    import sys
    from urllib.parse import parse_qs, unquote
    
    # Handle the request
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    headers = event.get('headers', {})
    body = event.get('body', '')
    
    # Create WSGI environ
    environ = {
        'REQUEST_METHOD': method,
        'PATH_INFO': path,
        'QUERY_STRING': event.get('queryStringParameters') or '',
        'CONTENT_TYPE': headers.get('content-type', ''),
        'CONTENT_LENGTH': str(len(body)) if body else '0',
        'wsgi.input': io.BytesIO(body.encode() if body else b''),
        'wsgi.errors': sys.stderr,
        'wsgi.version': (1, 0),
        'wsgi.multithread': False,
        'wsgi.multiprocess': True,
        'wsgi.run_once': False,
        'wsgi.url_scheme': 'https',
        'SERVER_NAME': headers.get('host', 'localhost'),
        'SERVER_PORT': '443',
    }
    
    # Add headers to environ
    for key, value in headers.items():
        key = 'HTTP_' + key.upper().replace('-', '_')
        environ[key] = value
    
    response_data = []
    
    def start_response(status, response_headers):
        response_data.append(status)
        response_data.append(response_headers)
    
    try:
        result = app(environ, start_response)
        body = b''.join(result).decode('utf-8')
        
        return {
            'statusCode': int(response_data[0].split()[0]),
            'headers': {header[0]: header[1] for header in response_data[1]},
            'body': body
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }

if __name__ == '__main__':
    app.run(debug=True, port=5000)