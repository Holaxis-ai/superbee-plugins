---
type: Convention
title: Resource
governs: Resource
path: resources/
description: A stable bundle record pointing to external material and explaining its relevance.
fields:
  required: [title, url]
  optional: [description, resource_type, provider, external_id, media_type, tags]
  types:
    tags: string-list
  descriptions:
    title: A recognizable name for the external resource.
    url: The absolute URL used to open the resource. Preserve meaningful query parameters and fragments. This string field does not validate URL syntax, availability or access; never store credentials or temporary signed access URLs.
    description: What the resource contains and when it is useful; recording a pointer does not imply its contents were inspected.
    resource_type: What the resource is, such as document, spreadsheet, presentation, folder, collection, website or dataset. Open vocabulary; use consistent names within the bundle.
    provider: Where the resource lives, such as google-drive, github or notion. Open vocabulary, not a connector or authorization.
    external_id: The provider-native identifier, interpreted with provider; distinct from the bundle document ID. Optional and not automatically extracted, matched or deduplicated.
    media_type: MIME type when known, such as application/pdf; omit rather than guessing. Descriptive text, not a validated media registry entry.
    tags: Bundle-specific discovery labels, represented as a list of strings.
links:
  related to: Resource
  part of: Resource
link_descriptions:
  related to: An associated Resource. Store the link on the referring record; no reciprocal edge is created automatically.
  part of: The containing Resource, such as a folder or collection. Direction is member to container; this does not assert provider membership or grant access. Avoid self-membership and containment cycles; the Kind does not enforce acyclicity or cardinality.
---
# Resource

Use the bundle document ID as the stable target of local references and update its URL when
its external location changes. See the [usage reference](../references/resource.md).
