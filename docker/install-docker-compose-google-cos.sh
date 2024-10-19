# From: https://serverfault.com/questions/1131479/installing-docker-compose-bin-plugin-on-googles-container-optimized-os
if [ ! -f /var/lib/google/docker-compose ]; then
    sudo curl -sSL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 -o /var/lib/google/docker-compose
    sudo chmod o+x /var/lib/google/docker-compose
    mkdir -p ~/.docker/cli-plugins
    ln -sf /var/lib/google/docker-compose ~/.docker/cli-plugins/docker-compose
fi
docker compose version
