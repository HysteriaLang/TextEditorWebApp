from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def hello():
    return jsonify({'message': 'Hello from flask on netlify!'})

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"status": "success", "data": "Test endpoint working"})

@app.route('/api/data', methods=['POST'])
def handle_data():
    data = request.get_json()
    return jsonify({"received": data, "status": "processed"})

def handler(event, context):
    from werkzeug.wrappers import Request, Response
    import io
    import sys

    # Create a WSGI environ from the Netlify event
    environ = {
        'REQUEST_METHOD': event.get('httpMethod', 'GET'),
        'PATH_INFO': event.get('path', '/'),
        'QUERY_STRING': event.get('queryStringParameters', ''),
        'CONTENT_TYPE': event.get('headers', {}).get('content-type', ''),
        'CONTENT_LENGTH': str(len(event.get('body', ''))),
        'wsgi.input': io.StringIO(event.get('body', '')),
        'wsgi.errors': sys.stderr,
        'wsgi.version': (1, 0),
        'wsgi.multithread': False,
        'wsgi.multiprocess': True,
        'wsgi.run_once': False,
        'wsgi.url_scheme': 'https',
    }

    # Add headers to environ
    for key, value in event.get('headers', {}).items():
        key = 'HTTP_' + key.upper().replace('-', '_')
        environ[key] = value
    
    response_data = []
    
    def start_response(status, headers):
        response_data.append(status)
        response_data.append(headers)
    
    result = app(environ, start_response)
    
    return {
        'statusCode': int(response_data[0].split()[0]),
        'headers': {header[0]: header[1] for header in response_data[1]},
        'body': ''.join(result)
    }

if __name__ == '__main__':
    app.run(debug=True)