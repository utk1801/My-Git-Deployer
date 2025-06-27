### Setup Guide

This Project contains following services and folders:

- `api-server`: HTTP API Server for REST API's
- `build-server`: Docker Image code which clones, builds and pushes the build to S3
- `s3-reverse-proxy`: Reverse Proxy the subdomains and domains to s3 bucket static assets
- `frontend-nextjs`: UI code for application

### Local Setup

1. Run `pnpm install` in all the 4 services i.e. `api-server`, `build-server`,`s3-reverse-proxy` and `frontend-nextjs`.
2. Docker build the `build-server` using below command :
   `cd build-server && docker build -t vercel-clone/builder-server .`
3. Setup the `api-server` by providing all the required config inside .env file for storing environment variables for AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and REDIS_URL.
4. Run `node index.js` in `api-server` and `s3-reverse-proxy`
5. Run `pnpm dev` in `frontend-nextjs`.

At this point following services would be up and running:

| S.No | Service            | PORT    |
| ---- | ------------------ | ------- |
| 1    | `api-server`       | `:9000` |
| 2    | `socket.io-server` | `:9002` |
| 3    | `s3-reverse-proxy` | `:8000` |
| 4    | `frontend-nextjs`  | `:3000` |

6. Navigate to `http://localhost:3000` to access the application.
