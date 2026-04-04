# GitHub + AWS Deployment

This project now includes a GitHub Actions deployment path for:

- GitHub repository
- AWS IAM OIDC role
- AWS S3 deployment bundle storage
- AWS Systems Manager Run Command
- AWS EC2 Windows instance
- IIS reverse proxy to the Node app

Recommended AWS shape:
- EC2 Windows instance for the app
- SQL Server reachable from the app
- IIS for public HTTPS/domain handling
- SSM-managed EC2 for remote deployment commands
- S3 bucket for deployment bundles

## AWS prerequisites

Create or prepare:
- 1 Windows EC2 instance
- SSM Agent active on the instance
- IAM instance profile that allows SSM management
- S3 bucket for deployment bundles
- IAM role for GitHub Actions using OIDC

Suggested EC2 software:
- Node.js 20+
- IIS
- URL Rewrite
- ARR
- NSSM

One-time Windows service setup:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\aws\register-windows-service.ps1 -DeploymentRoot "C:\inetpub\spl"
```

## GitHub repository configuration

Add this secret:
- `AWS_ROLE_TO_ASSUME`

Add these repository variables:
- `AWS_REGION`
- `AWS_DEPLOY_BUCKET`
- `AWS_SSM_INSTANCE_ID`
- `AWS_DEPLOY_ROOT`
- `AWS_WINDOWS_SERVICE_NAME`

Suggested values:
- `AWS_DEPLOY_ROOT=C:\inetpub\spl`
- `AWS_WINDOWS_SERVICE_NAME=SPLNodeApp`

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
8. trigger SSM Run Command on the Windows EC2 instance
9. run:
   - [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\deployment\aws\ec2-deploy.ps1](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\deployment\aws\ec2-deploy.ps1)

## First deployment

Before the first GitHub deployment:
1. copy the project to the server once or run a manual bootstrap
2. create:
   - `C:\inetpub\spl\.env.production.local`
   - `C:\inetpub\spl\app\.env.production.local`
   - `C:\inetpub\spl\app\spl-frontend\.env.production.local`
3. register the Windows service once
4. configure IIS with:
   - [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\deployment\iis\web.config](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\deployment\iis\web.config)

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
- the `AWS-RunPowerShellScript` SSM document

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
