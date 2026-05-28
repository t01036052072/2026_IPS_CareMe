from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "docs" / "careme_professor_expected_questions.pdf"
HOST = "127.0.0.1"
PORT = 8765


class DownloadHandler(BaseHTTPRequestHandler):
    def send_pdf_headers(self, length: int) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Length", str(length))
        self.send_header(
            "Content-Disposition",
            'attachment; filename="careme_professor_expected_questions.pdf"',
        )
        self.end_headers()

    def do_HEAD(self) -> None:
        path = unquote(urlparse(self.path).path)
        if path not in {"/", "/careme_professor_expected_questions.pdf"}:
            self.send_error(404)
            return

        if not PDF_PATH.exists():
            self.send_error(404, "PDF not found")
            return

        self.send_pdf_headers(PDF_PATH.stat().st_size)

    def do_GET(self) -> None:
        path = unquote(urlparse(self.path).path)
        if path not in {"/", "/careme_professor_expected_questions.pdf"}:
            self.send_error(404)
            return

        if not PDF_PATH.exists():
            self.send_error(404, "PDF not found")
            return

        data = PDF_PATH.read_bytes()
        self.send_pdf_headers(len(data))
        self.wfile.write(data)

    def log_message(self, format: str, *args) -> None:
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), DownloadHandler)
    print(f"Download URL: http://{HOST}:{PORT}/careme_professor_expected_questions.pdf", flush=True)
    server.serve_forever()
