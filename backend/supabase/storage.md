# Supabase Storage Strategy

The schema creates three private buckets:

- `profile-images/{user_id}/...`
- `machine-images/{machine_id}/...`
- `material-images/{material_id}/...`

The folder prefix is intentional. Storage policies use it to verify that the authenticated user owns the profile, machine, or material record. Keep all three buckets private and return short-lived signed URLs from the backend when an image must be displayed. Do not expose the service-role key to the frontend.

The SQL migration includes owner-only policies for profile images and owner-only write policies for machine and material images. Public listing reads should use backend-generated signed URLs, which keeps storage access separate from marketplace row visibility.