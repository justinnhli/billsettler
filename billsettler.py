from os import chdir
from os.path import dirname

from flask import Flask, send_from_directory

app = Flask(__name__)

@app.route('/')
def serve(file):
    return send_from_directory('static', 'billsettler.html')

@app.route('/billsettler.css')
def serve_css(file):
    return send_from_directory('static', 'billsettler.css')

@app.route('/billsettler.js')
def serve_js(file):
    return send_from_directory('static', 'billsettler.js')

if __name__ == '__main__':
    chdir(dirname(__file__))
    app.run()
