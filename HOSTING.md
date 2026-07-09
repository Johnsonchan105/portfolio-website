# Hosting — mini PC + public URL

The site runs as a Docker container on the mini PC (`~/stacks/portfolio`,
service `portfolio`, nginx on port **8090**). Update flow:

```bash
ssh johnsonchan105@192.168.1.125
cd ~/stacks/portfolio && git pull && docker compose build && docker compose up -d
```

- LAN: http://192.168.1.125:8090
- Tailscale: http://100.104.222.22:8090

## Going public (one-time, ~20 min, needs the domain)

1. Buy the domain — recommended **johnsonchan.dev at Porkbun (~$12/yr flat)**.
2. Add the site to a free Cloudflare account (Websites → Add site → free plan)
   and point the domain's nameservers at Cloudflare (Porkbun dashboard → NS).
3. On the mini PC, install `cloudflared` and create the tunnel:
   ```bash
   curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
   echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
   sudo apt-get update && sudo apt-get install -y cloudflared
   cloudflared tunnel login                      # opens a browser auth link
   cloudflared tunnel create portfolio
   cloudflared tunnel route dns portfolio johnsonchan.dev
   ```

   If `cloudflared tunnel route dns` fails with `An A, AAAA, or CNAME record
   with that host already exists`, open Cloudflare DNS for the zone and delete
   only the conflicting `A`, `AAAA`, or `CNAME` record for `@` /
   `johnsonchan.dev`, then rerun the route command. Keep any unrelated records
   such as `NS`, `SOA`, `MX`, or ownership-verification `TXT` records.
4. `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: portfolio
   credentials-file: /home/johnsonchan105/.cloudflared/<tunnel-id>.json
   ingress:
     - hostname: johnsonchan.dev
       service: http://localhost:8090
     - service: http_status:404
   ```
5. `sudo cloudflared service install && sudo systemctl enable --now cloudflared`

No router ports opened; `.dev` requires HTTPS and the tunnel provides it.
The same tunnel can later add `jobs-<friend>.johnsonchan.dev` hostnames for
the multi-user job-search instances (see that design spec in the Job Search
repo).

GitHub Pages (johnsonchan105.github.io) still works as a fallback via
`npm run deploy`; retire it once the domain is live.
