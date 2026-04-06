# GitHub + AWS Deployment

This project now includes a GitHub Actions deployment path for:

- GitHub repository
- AWS IAM OIDC role
- AWS S3 deployment bundle storage
- AWS Systems Manager Run Command
- AWS EC2 Amazon Linux instance
- Nginx reverse proxy to the Node app

Recommended AWS shape:
- EC2 Amazon Linux 2023 instance for the app
- SQL Server reachable from the app
- Nginx for public HTTPS/domain handling
- SSM-managed EC2 for remote deployment commands
- S3 bucket for deployment bundles

## AWS prerequisites

Create or prepare:
- 1 Amazon Linux EC2 instance
- SSM Agent active on the instance
- IAM instance profile that allows SSM management
- S3 bucket for deployment bundles
- IAM role for GitHub Actions using OIDC

Suggested EC2 software:
- Node.js 20+
- Nginx
- unzip
- python3

One-time EC2 bootstrap on the Linux server:

```bash
curl -fsSL https://raw.githubusercontent.com/jaycorner04/Spl-website/main/deployment/aws/bootstrap-amazon-linux.sh | sudo bash -s -- --deployment-root /srv/spl --service-name spl-node-app
```

## GitHub repository configuration

Required repository secrets:
- `PROD_DB_SERVER`
- `PROD_DB_PORT`
- `PROD_DB_NAME`
- `PROD_DB_BOOTSTRAP_DATABASE`
- `PROD_DB_USER`
- `PROD_DB_PASSWORD`
- `PROD_AUTH_SECRET`
- `PROD_MONITORING_TOKEN`

Optional repository secrets:
- `PROD_CORS_ALLOWED_ORIGINS`
- `PROD_VITE_HERO_VIDEO_URL`

Optional repository variables:
- `AWS_REGION`
- `AWS_DEPLOY_BUCKET`
- `AWS_SSM_INSTANCE_ID`
- `AWS_DEPLOY_ROOT`
- `AWS_SERVICE_NAME`
- `PROD_PORT`
- `PROD_HOST`
- `PROD_RATE_LIMIT_ENABLED`
- `PROD_DB_ENCRYPT`
- `PROD_DB_TRUST_SERVER_CERTIFICATE`
- `PROD_VITE_API_BASE_URL`
- `PROD_VITE_ENABLE_HERO_VIDEO`

Current workflow defaults already match your setup:
- `AWS_REGION=eu-north-1`
- `AWS_DEPLOY_BUCKET=splleague`
- `AWS_SSM_INSTANCE_ID=i-093564b6313ba6587`
- `AWS_DEPLOY_ROOT=/srv/spl`
- `AWS_SERVICE_NAME=spl-node-app`
- `AWS_ROLE_TO_ASSUME=arn:aws:iam::501410019989:role/GitHubActionsSPLDeployRole`

## What the workflow does

The workflow file is:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\.github\workflows\aws-ec2-deploy.yml](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\.github\workflows\aws-ec2-deploy.yml)

It will:
1. checkout the repo
2. install backend and frontend dependencies
3. run `npm run release:check`
4. create a deployment zip
5. assume AWS credentials with GitHub OIDC
6. upload the bundle to S3
7. create a presigned URL
8. trigger SSM Run Command on the Linux EC2 instance
9. run:
   - [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\deployment\aws\ec2-deploy-linux.sh](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\deployment\aws\ec2-deploy-linux.sh)

## First deployment

Before the first GitHub deployment:
1. run the Linux bootstrap script once on the EC2 instance
2. add the required production secrets to GitHub
3. confirm the SQL Server host is reachable from the EC2 instance
4. trigger the workflow manually or push to `main`

After that, GitHub Actions can handle repeat deployments.

## Required AWS permissions

Your GitHub OIDC IAM role should allow at least:
- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject`
- `s3:ListBucket`
- `ssm:SendCommand`
- `ssm:GetCommandInvocation`
- `ssm:ListCommandInvocations`
- `ec2:DescribeInstances`

Scope these to:
- your deployment bucket
- the target EC2 instance
- the `AWS-RunShellScript` SSM document

## Deployment trigger

The workflow runs on:
- push to `main`
- manual `workflow_dispatch`

## Post-deploy verification

After the domain is live:

```powershell
$env:DEPLOY_FRONTEND_BASE_URL="https://your-domain"
$env:DEPLOY_API_BASE_URL="https://your-domain/api"
npm run qa:deployed
```

If your app is same-origin and `/api` is on the same domain, you can omit `DEPLOY_API_BASE_URL`.
