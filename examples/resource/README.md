# Resource pointers (synthetic example)

The [Resource recipe](../../recipes/resource) supports a document, its containing folder,
and a related website using one Kind. All URLs and provider IDs below are fictional; no
provider is contacted. Do not infer Google Drive integration from these metadata values.

From the repository root, choose an absent scratch directory for BUNDLE. Use the public CLI
`superbee@0.4.6-pre.2`, the version exercised by the consumer test:

```sh
superbee init --create-only --recipe none --dir "$BUNDLE"
superbee recipe add ./recipes/resource --dir "$BUNDLE" --actor process:resource-example
superbee new Resource project-folder --title 'Project folder' --url 'https://example.invalid/drive/folders/project' --resource_type folder --provider google-drive --dir "$BUNDLE" --actor process:resource-example
superbee new Resource project-site --title 'Project website' --url 'https://example.invalid/project' --resource_type website --dir "$BUNDLE" --actor process:resource-example
superbee new Resource project-doc --title 'Project overview' --url 'https://example.invalid/docs/project' --description 'Start here for project scope.' --resource_type document --provider google-drive --external_id fictional-doc-id --media_type application/vnd.google-apps.document --tags project --tags onboarding --link 'part of=resources/project-folder' --link 'related to=resources/project-site' --dir "$BUNDLE" --actor process:resource-example
superbee doc read resources/project-doc --dir "$BUNDLE"
superbee link show resources/project-doc --dir "$BUNDLE"
superbee status --dir "$BUNDLE"
```

Only title and url are required; a minimal pointer can omit every other field. A collection
needs its own URL in this model. The two links run from project-doc to the folder and website;
no reciprocal links, remote membership changes or content inspection are implied.

Run the isolated public-package consumer test (it downloads the exact CLI from npm):

```sh
npm exec -- node --test scripts/resource.test.mjs
```

It checks portable/inert and repeated installation, minimal/full records, metadata round trips,
both relationship targets and direction, refusal of missing fields and invalid field types,
and detection of a relationship pointing to the wrong Kind. No credentials are used.
