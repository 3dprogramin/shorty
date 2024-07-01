# URL Shortener Service

This project is a free and open-source URL shortening service built with Node.js using the Koa framework. It serves as an alternative to services like bit.ly and tinyurl.com. The service allows you to shorten URLs, store them in memory or Redis, retrieve them using short identifiers, and view analytics for each URL. It also includes a Bash CLI for easy interaction with the service.

## Features

- 🌐 Shorten URLs and retrieve them using short identifiers.
- 💾 Choose between in-memory or Redis storage.
- 📊 View analytics for each shortened URL.
- 💻 Bash CLI for submitting URLs.
- 🖼 Generate QR codes for shortened URLs.
- 🛠️ Simple error handling and logging.

## Prerequisites

- Node.js (>= 12.x)
- Redis (optional, if using Redis storage)
- Bash (for CLI usage)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/url-shortener.git
cd url-shortener
```

2. Install dependencies:
```bash
npm install
```

Optional dependency for QR code generation in CLI:
```bash
npm install -g qrcode-terminal    # sudo might be required
```

3. Set up environment variables:

Modify the `.env` file inside the root directory to fit your needs:

```env
TOKEN=your_secret_token
PORT=3000
ID_LENGTH=3
STORAGE=memory    # or 'redis' for persistent storage between restarts
```

## Usage

### Starting the server

To start the server, run the following command:

```bash
npm run start
```

### CLI

##### Basic usage

```bash
TOKEN=your_secret_token ./bin/url.sh http://example.com
http://127.0.0.1:3000/1hJ
```

##### Custom ID (optional)

```bash
TOKEN=your_secret_token ./url.sh http://example.com my-custom-id
http://127.0.0.1:3000/my-custom-id
```

##### QR code (optional)

Set `QR` environment variable to generate QR code for the generated URL *(this requires `qrcode-terminal` to be installed)*

![images/qr.png](images/qr.png)

### Analytics

You can view the analytics for each shortened URL by appending a `+` to the URL ID. The analytics endpoint returns a JSON response with the number of visits, the original URL, and the ID itself.

```bash
curl http://127.0.0.1:3000/1hJ+
{"status":"success","visits":8,"url":"http://example.com","id":"1hJ"}
```

### Error Handling

The service provides error messages for various scenarios such as missing URLs, invalid tokens, and ID conflicts. These errors are logged and returned in the response body on the server side.

The CLI also includes error handling for cases such as missing arguments, missing tokens, server unreachable, and errors returned by the server. These errors are printed to the console to inform the user of the issue.

### Logging

Each request is logged to the console with the HTTP method, URL, and response status.

### Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

### License

This project is licensed under the MIT License.