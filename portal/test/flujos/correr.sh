#!/bin/bash
# Pruebas de recorrido del portal en modo local (sin la base real). Uso, desde la raíz del repo:
#   PORT=8107 node portal/test/dev-server.mjs &
#   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9307 --user-data-dir=/tmp/bp-chrome about:blank &
#   bash portal/test/flujos/correr.sh
# Puertos y carpetas: BP_PUERTO (8107), BP_CHROME (9307), BP_CAPTURAS (/tmp/bp-flujos). Sale con 1 si algo falla.
cd "$(dirname "$0")"
falla=0
corre() { local n="$1"; shift; node "$@" > "/tmp/bp-flujo-$n.out" 2>&1; local r; r=$(python3 -I leer.py "/tmp/bp-flujo-$n.out" "$n"); echo "$r"; case "$r" in *" OK "*) ;; *) falla=1;; esac; }
node humo.mjs > /tmp/bp-flujo-humo.out 2>&1; echo "humo: $(grep -c '": "' /tmp/bp-flujo-humo.out) páginas con título (esperadas: 15)"
corre t1-mediano-celular t1-mediano.mjs mobile
corre t1-mediano-compu t1-mediano.mjs desktop
corre t2-tradicional t2-tradicional.mjs desktop
corre t3-emprendimiento t3-emprendimiento.mjs mobile
corre t4-importar t4-importar.mjs mobile
corre t6-editar t6-editar.mjs mobile
corre t7-curacion t7-curacion.mjs
corre t8-store-venta t8-store-venta.mjs
exit $falla
