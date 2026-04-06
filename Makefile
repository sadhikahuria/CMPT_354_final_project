setup:
	powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

run:
	powershell -ExecutionPolicy Bypass -File scripts/run.ps1

verify:
	powershell -ExecutionPolicy Bypass -File scripts/verify.ps1

test: verify
