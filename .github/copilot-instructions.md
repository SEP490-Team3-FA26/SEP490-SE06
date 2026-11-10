# GitHub Copilot Instructions - WDP301 / SEP490

When assisting developers in this repository, always adhere to the following architecture standards:
- Write operations at API Gateway return HTTP 202 ACCEPTED with Kafka event emission.
- Microservices communicate strictly via Kafka (no direct internal HTTP calls).
- Zero mock data allowed in production code.
- All code comments must be written in 100% Vietnamese.
- When generating new services or controllers, always generate test suites covering [Normal Values], [Boundary Values], and [Abnormal Values].
- Run `npm run rules:check` to verify architecture compliance.

