/**
 * @packageDocumentation
 * The HTTP calls this package's operator commands make against an n8n
 * instance's public REST API. `n8n-workflow.ts` next door is the half
 * that opens no socket and wants no credential, answering what it can
 * from a workflow VALUE; this is the half where both happen, so a
 * caller reaching for this module is one that has decided to talk to
 * a running instance rather than to reason about a file.
 *
 * Where that instance is and what authenticates against it are
 * configuration rather than anything this module invents.
 * `AR_N8N_URL` is the base URL every call below is built on and
 * `AR_N8N_API_KEY` is the key the instance issued for those calls,
 * both declared in `src/config.ts`. Both are optional there, so
 * parsing configuration refuses neither, and the refusal for an
 * absent value belongs to the command that wanted one:
 * `deploy-external.ts` reports which of the two is missing before it
 * attempts a request. That leaves this module nothing to check at
 * load.
 *
 * Nothing here reaches an instance until it is called, which is the
 * other half of the same property. Importing this module opens no
 * socket and sends no request: the calls are functions, and a file
 * that names them has made none of them. That is what keeps it
 * importable by the default suite, which touches no external service
 * at all — one doing its HTTP at load could not be reached from there
 * at any price, and that rule is one `AGENTS.md` states with an
 * incident behind it rather than a preference of style.
 *
 * Two of the three instance-facing commands in this directory call
 * in, and all three arrive later in this stage. `deploy-external.ts`
 * uploads built artifacts and `audit-workflows.ts` reads back what an
 * instance is holding, both over the API; `activate-workflows.sh` is
 * the one that does not, activation going through the n8n CLI against
 * a local container rather than over HTTP. So `n8n-workflow.ts`
 * answers for three commands where this module serves two, and what
 * parts them is a transport rather than an omission. The live seam
 * under `tests/live/` arrives with them and is no command at all.
 *
 * `listWorkflows`, `createWorkflow`, `updateWorkflow` and
 * `activateWorkflow` are those calls, and a named error carrying the
 * endpoint, the status and the response body reports any reply that
 * is not a success. They arrive next in this stage, each taking the
 * fetch it uses as an argument, so a case can drive one against a
 * stub and the isolated suite stays isolated by construction rather
 * than by discipline.
 */
