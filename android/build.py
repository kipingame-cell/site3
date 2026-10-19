#!/usr/bin/env python3
"""Build the offline APK using Android SDK tools; no Gradle or npm dependencies."""
import argparse, hashlib, json, os, pathlib, secrets, shutil, subprocess, zipfile, urllib.request

HERE=pathlib.Path(__file__).resolve().parent
ROOT=HERE.parent

def run(args):
    subprocess.run([str(x) for x in args],check=True)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--sdk-root',type=pathlib.Path,required=True)
    parser.add_argument('--signing-dir',type=pathlib.Path,default=HERE/'signing')
    args=parser.parse_args()
    sdk=args.sdk_root.resolve()
    aapt=next(sdk.rglob('aapt2'))
    tools=aapt.parent
    jar=sdk/'android-35/android.jar'
    if not jar.is_file(): jar=next(sdk.glob('platforms/android-35/android.jar'))
    for tool in ['aapt2','d8','zipalign','apksigner']:
        (tools/tool).chmod(0o755)
    build=HERE/'build'
    if build.exists():shutil.rmtree(build)
    for d in ['gen','classes','dex','assets/www']: (build/d).mkdir(parents=True)
    assets=build/'assets/www'
    shutil.copytree(ROOT/'public',assets,dirs_exist_ok=True)
    # The modular website omits three PDF dependencies; pin the verified site2 copies.
    dependencies = {
        'PT_Serif-Web-Regular.ttf': 'a4951fade06ff8f09b7673aa81ffb65a8cd409e24d3289a6dc670bc4dda2557a',
        'PT_Serif-Web-Bold.ttf': '038ba7336bd7ea14f12ad155bed51a4345cac5153275d521dec3ba04021c526e',
        'pdfmake.min.js': 'af1c878d756812912bf24f0068f3c7dd3ba1adbe578cf9ad8052f55eb78378ea',
        'vfs_fonts.js': 'e6a5cd79421e567b9b5f7cfb5cfe4df4ff75ba7a3809398badb6c2af53657297',
    }
    cache=HERE/'vendor-cache'; cache.mkdir(exist_ok=True)
    for name, digest in dependencies.items():
        target=assets/'vendor'/name
        if not target.is_file():
            cached=cache/name
            if not cached.is_file():
                url='https://raw.githubusercontent.com/kipingame-cell/site2/9e3c79cb4a88ecd9f0e27c09dc09ab269f2a3ab5/public/vendor/'+name
                with urllib.request.urlopen(url,timeout=90) as response: cached.write_bytes(response.read())
            if hashlib.sha256(cached.read_bytes()).hexdigest()!=digest: raise RuntimeError('Dependency checksum: '+name)
            shutil.copyfile(cached,target)

    shutil.copyfile(HERE/'native.js',assets/'native.js')
    html=assets/'app.html'
    html.write_text(html.read_text().replace('<script src="./vendor/pdfmake.min.js">','<script src="./native.js"></script>\n  <script src="./vendor/pdfmake.min.js">'))
    app=assets/'js/app.js'
    code=app.read_text()
    old='pdfMake.createPdf(buildPdfDef(lastResult, d1, d2, mode)).download(file);'
    new="const report = pdfMake.createPdf(buildPdfDef(lastResult, d1, d2, mode));\n    report.getBase64(base64 => AndroidBridge.saveFile(file, 'application/pdf', base64));"
    assert old in code, 'PDF hook changed upstream; update Android adapter'
    code=code.replace(old,new)
    # All sharing links must point at the public web calculator, not the local HTTPS origin.
    code=code.replace('new URL(location.origin + location.pathname)',"new URL('https://kipingame-cell.github.io/site2/app.html')")
    app.write_text(code)
    card=assets/'js/shareCard.js'
    card.write_text(card.read_text().replace('new URL(location.origin + location.pathname)',"new URL('https://kipingame-cell.github.io/site2/app.html')"))
    pdf=assets/'js/pdfExport.js'
    pdf.write_text(pdf.read_text().replace("https://kipingame-cell.github.io/site3/","https://kipingame-cell.github.io/site2/"))
    (assets/'android-build.json').write_text(json.dumps({'version':'1.0.1','source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'offline':True},indent=2))
    run([tools/'aapt2','compile','--dir',HERE/'res','-o',build/'resources.zip'])
    base=build/'unsigned.apk'
    run([tools/'aapt2','link','-I',jar,'--manifest',HERE/'AndroidManifest.xml','--min-sdk-version','26','--target-sdk-version','35','--auto-add-overlay','-R',build/'resources.zip','-A',build/'assets','--java',build/'gen','-o',base])
    with zipfile.ZipFile(base) as check:
        assert 'AndroidManifest.xml' in check.namelist(), 'aapt2 did not produce a valid APK'
    sources=list((HERE/'src').rglob('*.java'))+list((build/'gen').rglob('*.java'))
    run(['java','com.sun.tools.javac.Main','--release','8','-classpath',jar,'-encoding','UTF-8','-d',build/'classes',*sources])
    classes=list((build/'classes').rglob('*.class'))
    run([tools/'d8','--lib',jar,'--min-api','26','--output',build/'dex',*classes])
    with zipfile.ZipFile(base,'a',compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(build/'dex/classes.dex','classes.dex')
    aligned=build/'aligned.apk'
    run([tools/'zipalign','-f','-p','4',base,aligned])
    signing=args.signing_dir.resolve();signing.mkdir(mode=0o700,parents=True,exist_ok=True)
    key=signing/'matrix-release.keystore';password=signing/'password.txt'
    if not key.exists():
        raise RuntimeError('Existing release signing key required; refusing incompatible key creation')
    out=HERE/'dist';out.mkdir(exist_ok=True)
    apk=out/'Matrix-Sudby-1.0.1.apk'
    run([tools/'apksigner','sign','--ks',key,'--ks-key-alias','matrix-release','--ks-pass','file:'+str(password),'--out',apk,aligned])
    run([tools/'apksigner','verify','--verbose',apk])
    run([tools/'zipalign','-c','-p','4',apk])
    run([tools/'aapt2','dump','badging',apk])
    digest=hashlib.sha256(apk.read_bytes()).hexdigest()
    (out/'SHA256SUMS').write_text(digest+'  '+apk.name+'\n')
    # Keep this private backup: subsequent APKs must use the same signing identity.
    backup=out/'Matrix-Sudby-signing-backup.zip'
    with zipfile.ZipFile(backup,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(key,key.name);archive.write(password,password.name)
        archive.writestr('README.txt','Private signing key for ru.kipin.matrix. Keep private. Alias: matrix-release. Password: password.txt. Supply --signing-dir with these files for update builds. Never publish this archive in GitHub.\n')
    backup.chmod(0o600)
    print('APK:',apk)
    print('SHA256:',digest)

if __name__=='__main__':main()
