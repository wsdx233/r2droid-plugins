const host = window.R2PluginHost;
let state = { running:false, apkPath:'', outputDir:'', r2ScriptPath:'', r2Preview:'' };
const I18N = {
  en:{title:'Blutter',chooseApk:'Choose APK',chooseOut:'Choose Output Dir',pickResult:'Choose Existing Result',run:'Run Blutter',stop:'Stop',setup:'Setup / Repair',openOut:'Open Output',gen:'Generate r2 script',apply:'Execute in current project',preview:'Preview',clear:'Clear Log',idle:'Idle',running:'Running...',done:'Done',failed:'Failed',copy:'Copy',hint:'Run blutter on a Flutter APK, or choose an existing blutter output directory, then generate/apply an r2 script in the current project.'},
  zh:{title:'Blutter',chooseApk:'选择 APK',chooseOut:'选择输出目录',pickResult:'选择已有结果',run:'运行 Blutter',stop:'停止',setup:'安装 / 修复环境',openOut:'打开输出结果',gen:'生成 r2 脚本',apply:'在当前项目执行',preview:'预览',clear:'清空日志',idle:'空闲',running:'运行中...',done:'完成',failed:'失败',copy:'复制',hint:'对 Flutter APK 运行 blutter，或选择已有 blutter 输出目录，然后生成/在当前项目直接执行 r2 脚本。'},
  ru:{title:'Blutter',chooseApk:'Выбрать APK',chooseOut:'Выбрать каталог',pickResult:'Выбрать результат',run:'Запустить Blutter',stop:'Стоп',setup:'Установка / ремонт',openOut:'Открыть результат',gen:'Создать r2 script',apply:'Выполнить в проекте',preview:'Просмотр',clear:'Очистить лог',idle:'Ожидание',running:'Выполняется...',done:'Готово',failed:'Ошибка',copy:'Копировать',hint:'Запустите blutter для Flutter APK или выберите каталог результата, затем создайте/примените r2 script в текущем проекте.'}
};
let lang='en';
function t(k){return (I18N[lang]&&I18N[lang][k])||I18N.en[k]||k}
function initLang(){try{const l=(host&&host.systemLanguage?host.systemLanguage():navigator.language||'').toLowerCase();lang=l.startsWith('zh')?'zh':(l.startsWith('ru')?'ru':'en')}catch(e){lang=(navigator.language||'').startsWith('zh')?'zh':'en'}document.documentElement.lang=lang;}
function $(id){return document.getElementById(id)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function shQuote(v){return "'"+String(v).replace(/'/g,"'\"'\"'")+"'"}
function baseName(p){return String(p||'apk').split('/').pop().replace(/\.apk$/i,'').replace(/[^A-Za-z0-9_.-]/g,'_')||'apk'}
function dataDir(){try{return host.dataDir()}catch(e){return ''}}
function pluginDir(){try{return host.pluginDir()}catch(e){return ''}}
function defaultOut(){return dataDir()+'/blutter-output/'+baseName(state.apkPath||'apk')+'-'+Date.now()}
function toast(msg,cls=''){const s=$('status');if(s){s.className='status '+cls;s.textContent=msg}}
function log(msg){const el=$('log');if(el){el.textContent+=msg+'\n';el.scrollTop=el.scrollHeight}}
function setText(id,text){const el=$(id);if(el)el.textContent=text}
function refreshUi(){setText('apkPath',state.apkPath?'APK: '+state.apkPath:'APK: -');setText('outPath',state.outputDir?'Output: '+state.outputDir:'Output: default');setText('r2Path',state.r2ScriptPath?'r2: '+state.r2ScriptPath:'r2: -')}
function pickApk(){try{const p=host.pickFile('blutter-apk-'+Date.now());if(p&&!p.startsWith('Error:')){state.apkPath=p;if(!state.outputDir)state.outputDir=defaultOut();refreshUi()}else if(p){toast(p,'err');log(p)}}catch(e){toast(String(e),'err')}}
function pickOutputDir(){try{const p=host.pickDirectory('blutter-out-'+Date.now());if(p&&!p.startsWith('Error:')){state.outputDir=p+'/blutter-'+baseName(state.apkPath||'apk')+'-'+Date.now();refreshUi()}else if(p){toast(p,'err');log(p)}}catch(e){toast(String(e),'err')}}
function pickResultDir(){try{const p=host.pickDirectory('blutter-result-'+Date.now());if(p&&!p.startsWith('Error:')){state.outputDir=p;state.r2Preview='';state.r2ScriptPath='';refreshUi()}else if(p){toast(p,'err');log(p)}}catch(e){toast(String(e),'err')}}
function setupEnvironment(){toast('Setup...');try{log(host.prepareProot(true))}catch(e){toast(String(e),'err')}}
function runBlutter(){if(state.running)return;if(!state.apkPath){toast('Choose APK first','err');return}try{if(host.isProotPrepared()!=='true'){log('Plugin proot not ready; opening setup dialog.');host.prepareProot(false);toast('Setup required','warn');return}}catch(e){}const out=state.outputDir||defaultOut();state.outputDir=out;refreshUi();const script=pluginDir()+'/scripts/run_blutter.sh';const cmd='bash '+shQuote(script)+' '+shQuote(state.apkPath)+' '+shQuote(out);log('$ '+cmd);const started=host.prootProcStart('blutter','plugin',cmd);if(started!=='ok'){toast(started,'err');log(started);return}state.running=true;toast(t('running'));pollOutput()}
function pollOutput(){if(!state.running)return;let chunk='';try{chunk=host.procRead('blutter',500,200)}catch(e){chunk=String(e)}if(chunk){log(chunk);if(chunk.includes('[[exit:')){state.running=false;if(chunk.includes('[[exit:0]]'))toast(t('done'),'ok');else toast(t('failed'),'err');return}}setTimeout(pollOutput,700)}
function stopRun(){try{log(host.procStop('blutter'))}catch(e){log(e)}state.running=false;toast('Stopped','err')}
function openOutput(){if(!state.outputDir){toast('No output directory','err');return}try{const r=host.openPath(state.outputDir);if(String(r).startsWith('Error:'))toast(r,'err');else toast(t('openOut'),'ok')}catch(e){toast(String(e),'err')}}
function generateR2(){if(!state.outputDir){toast('No output directory','err');return}toast(t('running'));const script=pluginDir()+'/scripts/generate_r2.py';const cmd='python3 '+shQuote(script)+' '+shQuote(state.outputDir);log('$ '+cmd);let out='';try{out=host.prootRun('plugin',cmd)}catch(e){toast(String(e),'err');log(e);return}if(!out.trim()||out.startsWith('Error:')){toast(t('failed'),'err');log(out);return}state.r2Preview=out;const name='blutter/apply_blutter_'+Date.now()+'.r2';try{const r=host.writeData(name,out);if(String(r).startsWith('error')||String(r).startsWith('invalid')){toast(r,'err');return}state.r2ScriptPath=dataDir()+'/'+name;refreshUi();toast(t('done'),'ok');log('Generated: '+state.r2ScriptPath)}catch(e){toast(String(e),'err')}}
function applyR2(){if(!state.r2Preview){generateR2();if(!state.r2Preview)return}toast(t('running'));try{const r=host.r2(state.r2Preview);toast(t('done'),'ok');if(r&&r.trim())showDetail(r)}catch(e){toast(String(e),'err')}}
function previewR2(){if(!state.r2Preview){generateR2();if(!state.r2Preview)return}showDetail(state.r2Preview)}
function clearLog(){if($('log'))$('log').textContent=''}
function copyText(text){try{if(navigator.clipboard)navigator.clipboard.writeText(String(text));else{const ta=document.createElement('textarea');ta.value=String(text);document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}toast(t('copy'),'ok')}catch(e){toast(String(e),'err')}}
function showDetail(text){const d=$('detail'),c=$('detailText');if(d&&c){c.textContent=text||'';d.classList.add('show')}}
function hideDetail(){const d=$('detail');if(d)d.classList.remove('show')}
function setupCommon(){if(window.__blutterSetup)return;window.__blutterSetup=true;initLang();document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));toast(t('idle'));refreshUi();const detail=document.createElement('div');detail.id='detail';detail.className='detail';detail.innerHTML=`<div class="sheet"><div class="row"><button onclick="hideDetail()">OK</button><button onclick="copyText($('detailText').textContent)">${t('copy')}</button></div><pre id="detailText"></pre></div>`;document.body.appendChild(detail);try{log('Plugin ready. Data dir: '+host.dataDir())}catch(e){}}
window.addEventListener('r2pluginready',setupCommon);
window.addEventListener('load',()=>setTimeout(setupCommon,200));
