# Clinic changes — 9 September 2026

The canonical clinic is https://davidgavrilovic20002-spec.github.io/petfind/clinic/index.html.
All delivered clinical features are now under this existing site's `clinic/` directory.
The owner homepage, owner-only dashboard restriction, vet patient creation, translations,
breed selection, record withdrawal and patient removal remain in place.

- `operations.html`: connected clinical working forms with server-side revisions.
- `clinical.html`: explicitly labelled interactive demonstration with example data.
- `security.html`: clinic-only reset-link request, recovery, TOTP enrollment/challenge.
  It uses the same Supabase account, never the owner dashboard. Recovery flags are read
  before the SDK consumes the URL; existing MFA is challenged before password change.
- Clinic homepage and patient record navigation link the new features.

`clinic_work_items` and `clinic_work_revisions` already exist in the shared Supabase
project from the prior delivery. The new migration aligns their access predicate with
existing can_read_pet/can_write_pet rules for vet-created unclaimed patients, retaining
approved-vet, AAL2 and non-deleted-patient checks. No account roles, passwords or existing
patient grants are changed.

The full requested practice-management system is not complete. Connected forms are not
certified prescriptions/invoices. Laboratory/PACS, regulatory transmission, controlled
stock, fiscal certification, external payments, AI and hardware connections are pending.
