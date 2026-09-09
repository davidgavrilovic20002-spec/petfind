// Capture only non-secret recovery flags before Supabase consumes the URL fragment.
(function(){const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.slice(1));window.PFClinicRecovery={requested:q.get('mode')==='recovery',credentialPresent:(h.get('type')==='recovery'&&h.has('access_token'))||q.has('code'),failed:h.has('error')||q.has('error')};})();
