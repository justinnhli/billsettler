from os import chdir, getcwd
from os.path import dirname, realpath

from flask import Flask, send_from_directory

app = Flask(__name__)

@app.route('/')
def serve():
    return send_from_directory('static', 'billsettler.html')

@app.route('/<file>')
def serve_css(file):
    return send_from_directory('static', file)

if __name__ == '__main__':
    chdir(dirname(realpath(__file__)))
    app.run()
