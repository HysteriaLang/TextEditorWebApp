from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Store for temporary file handling (in-memory for serverless)
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
        
        # Store file info (in memory for serverless)
        file_id = len(temp_files)
        temp_files[file_id] = {
            'filename': filename,
            'content': content,
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
    try:
        path = event.get('path', '')
        method = event.get('httpMethod', 'GET')
        body = event.get('body', '')
        
        # Parse body if it exists
        if body:
            try:
                body_data = json.loads(body)
            except:
                body_data = {}
        else:
            body_data = {}
        
        # Route handling
        if path == '/api/' or path == '/api':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                },
                'body': json.dumps({"message": "Text Editor API is running"})
            }
        
        elif path.startswith('/api/save') and method == 'POST':
            filename = body_data.get('filename', f'document_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt')
            content = body_data.get('content', '')
            
            # Ensure filename ends with .txt
            if not filename.endswith('.txt'):
                filename += '.txt'
            
            # Store file info (in memory for serverless)
            file_id = len(temp_files)
            temp_files[file_id] = {
                'filename': filename,
                'content': content,
            }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                },
                'body': json.dumps({
                    'success': True, 
                    'message': 'File saved successfully',
                    'filename': filename,
                    'file_id': file_id,
                    'download_url': f'/api/download/{file_id}'
                })
            }
        
        elif path.startswith('/api/download/') and method == 'GET':
            file_id_str = path.split('/')[-1]
            try:
                file_id = int(file_id_str)
                if file_id in temp_files:
                    file_info = temp_files[file_id]
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'text/plain',
                            'Content-Disposition': f'attachment; filename="{file_info["filename"]}"',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': file_info['content']
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'File not found'})
                    }
            except ValueError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Invalid file ID'})
                }
        
        elif path.startswith('/api/load') and method == 'POST':
            # For file upload, we need to handle multipart form data
            # This is complex in serverless, so let's use the fallback method
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False, 
                    'message': 'File upload not supported in serverless mode. Using client-side fallback.'
                })
            }
        
        # Handle OPTIONS for CORS
        elif method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                },
                'body': ''
            }
        
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Not found'})
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }

if __name__ == '__main__':
    app.run(debug=True, port=5000)