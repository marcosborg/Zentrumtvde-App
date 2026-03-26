# Zentrum TVDE App

## Android USB live reload

1. Ligue o Android por USB e ative `Depuracao USB`.
2. Confirme que o dispositivo aparece:

```powershell
adb devices
```

3. Abra um terminal para o dev server:

```powershell
cd E:\APPS\zentrumtvde
npm run dev -- --host 0.0.0.0 --port 5173
```

4. Abra outro terminal para encaminhar a porta do Android para o PC:

```powershell
adb reverse tcp:5173 tcp:5173
```

5. Arranque a app no Android apontando o Capacitor para o dev server:

```powershell
cd E:\APPS\zentrumtvde
$env:CAP_SERVER_URL="http://localhost:5173"
npx cap run android
```

## Notas

- Alteracoes em `React`, `TypeScript` e `CSS` atualizam com live reload.
- Alteracoes em plugins nativos, `AndroidManifest.xml`, Gradle ou Capacitor exigem novo `npx cap sync android` e nova execucao.
- Para voltar ao modo normal de producao, feche o terminal onde definiu `CAP_SERVER_URL` ou limpe a variavel:

```powershell
Remove-Item Env:CAP_SERVER_URL
```
