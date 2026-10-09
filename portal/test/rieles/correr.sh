#!/bin/bash
# Pruebas de los rieles de BAIREN digital, en modo local (sin la base real). Desde la raíz del repo, con el servidor
# y Chrome levantados (igual que portal/test/flujos/correr.sh):
#   PORT=8107 node portal/test/dev-server.mjs &
#   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9307 --user-data-dir=/tmp/bp-chrome about:blank &
#   bash portal/test/rieles/correr.sh
# Puertos y carpeta: BP_PUERTO (8107), BP_CHROME (9307), BP_CAPTURAS (/tmp/bp-rieles). Cada prueba deja su salida en
# $BP_CAPTURAS/<prueba>.out. Sale con 1 si alguna falla.
cd "$(dirname "$0")/../../.."
export BP_PUERTO=${BP_PUERTO:-8107} BP_CHROME=${BP_CHROME:-9307} BP_CAPTURAS=${BP_CAPTURAS:-/tmp/bp-rieles}
mkdir -p "$BP_CAPTURAS"; falla=0
# Antes de cada prueba se cierran las pestañas que dejó la anterior: con muchas abiertas, Chrome frena los relojes de las
# de atrás y el sondeo del chat (cada 8 s) llega tarde.
limpiar_chrome() { curl -s "http://127.0.0.1:$BP_CHROME/json/list" | python3 -I -c 'import json,sys; [print(t["id"]) for t in json.load(sys.stdin) if t.get("type") == "page"]' 2>/dev/null | tail -n +2 | while read -r id; do curl -s "http://127.0.0.1:$BP_CHROME/json/close/$id" > /dev/null; done; }
corre() { limpiar_chrome; local n="$1"; shift; node "$@" > "$BP_CAPTURAS/$n.out" 2>&1; local r=$?
  local malos; malos=$(grep -ciE '^(FALLA|XX|✗|NO OK)|[1-9][0-9]* FALLAS?' "$BP_CAPTURAS/$n.out")
  if [ $r -ne 0 ] || [ "$malos" != "0" ]; then echo "FALLA  $n (salida $r, $malos líneas con falla) → $BP_CAPTURAS/$n.out"; falla=1; else echo "OK     $n"; fi; }
corre explorar        portal/test/rieles/explorar.mjs
corre mensajes        portal/test/rieles/mensajes.mjs
corre identidad       portal/test/rieles/identidad.mjs
corre documentos      portal/test/rieles/documentos.mjs
corre pagos-celular   portal/test/rieles/pagos.mjs celular
corre pagos-compu     portal/test/rieles/pagos.mjs compu
corre pagos-api       portal/test/rieles/pagos.mjs api
corre avisos-celular  portal/test/rieles/avisos.mjs mobile
corre avisos-compu    portal/test/rieles/avisos.mjs desktop
corre garantias-cel   portal/test/rieles/garantias.mjs mobile
corre garantias-compu portal/test/rieles/garantias.mjs desktop
corre desarrollos     portal/test/rieles/desarrollos.mjs
corre tarifas         portal/test/rieles/tarifas.mjs
exit $falla
