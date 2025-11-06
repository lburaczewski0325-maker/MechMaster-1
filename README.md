# MechMaster-1
Ai mech help

## API Key (required for live searches)

This app calls a generative language API to fetch repair instructions. For live searching to work when the site is hosted, provide an API key in one of these ways:

- Add a meta tag to `index.html` in the `<head>`:

	<meta name="mechmaster-api-key" content="YOUR_API_KEY_HERE">

- Or set a global variable before the main script runs (for example in a small inline script):

	<script>window.__MECHMASTER_API_KEY = 'YOUR_API_KEY_HERE'</script>

If no API key is present the app will show a local sample instruction set instead of performing live searches.
