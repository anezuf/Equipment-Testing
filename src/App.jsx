import { useState, useCallback, useMemo, useEffect, useRef } from "react";

import { B, VC, ICO, SM, WC } from "./constants";
import { DEF_SECTIONS, PDU_DEFAULT, mkAll, mkOff } from "./sections";
import { calcTotal, calcSec, hasFail } from "./scoring";
import { fmt } from "./utils";
import { exportTechSpecsXlsx } from "./utils/exportTechSpecs";
import Logo from "./components/Logo";
import Gauge from "./components/Gauge";
import RichNote from "./components/RichNote";
import SegBar from "./components/SegBar";
import NotePopup from "./components/NotePopup";
import AutoSizeTextarea from "./components/AutoSizeTextarea";
import * as XLSX from "xlsx";

const [IconNo,IconMid,IconYes]=ICO;


/* Weight: 0=Преимущество (excluded from score), 1=Требование, 2=Требование(!) critical */

/*
  Scoring logic:
  - Преимущество (w=0): excluded from calculation entirely
  - Требование (w=1): base=1, Требование! (w=2): base=2
  - Coefficients: score 0→0, score 1→0.5, score 2→1
  - Item points = base × coefficient
  - Total = (sum_earned / sum_max_ALL) × 10
  - sum_max_ALL = sum of base points for ALL Требования items (not just scored)
  - hasFail: any Требование (w>=1) with score===0
*/

function loadSaved(storageKey){
  try{
    const raw=localStorage.getItem(storageKey);
    if(!raw)return null;
    return JSON.parse(raw);
  }catch{return null;}
}

const EQ_TYPES=["стойка","pdu"];
const TECH_SPECS_DEFAULT=[
  {n:"Упаковка, комплектация и документация",items:[
    {n:"Внешний вид упаковки",n2:"Защитный картон, стрейч-пленка, демпфирующий материал, фиксация на паллете. Упаковка должна обеспечивать сохранность шкафа при транспортировке."},
    {n:"Внешняя чистота",n2:"Отсутствие пыли, грязи, пятен, следов технических жидкостей внутри и снаружи стойки."},
    {n:"Маркировка оборудования",n2:"Наличие четкой заводской этикетки (Серийный номер, Part Number, ревизия)."},
    {n:"Комплектация (ЗИП)",n2:"Наличие комплекта крепежа («сухари», винты, шайбы), ключей для дверей и боковых панелей, элементов заземления, комплекта для соединения стоек в ряд."},
    {n:"Документация",n2:"Наличие паспорта стойки и инструкции по сборке/эксплуатации."},
  ]},
  {n:"Внешний вид и габариты",items:[
    {n:"Габариты (Ширина и Глубина)",n2:"Допускается ширина стойки: 600, 750 или 800 мм. Допускается глубина: 1070 или 1200 мм."},
    {n:"Габариты (Высота)",n2:"Допускаются к использованию только стойки вместимостью 42U и 48U. Стойки габаритной высотой более 2.3 метра к рассмотрению не допускаются."},
    {n:"Разметка юнитов (U)",n2:"Нумерация юнитов на направляющих должна идти строго снизу вверх и соответствовать требованиям ГОСТ Р 70439-2022. Допускается только шелкография или лазерная гравировка (наклейки категорически запрещены)."},
    {n:"Лакокрасочное покрытие (ЛКП)",n2:"Порошковое покрытие с высокой адгезией (наклейки ЦОД должны держаться). Толщина краски не должна быть избыточной, чтобы не сужать монтажную ширину 19\" и не препятствовать установке закладных гаек («сухарей») в квадратные отверстия профилей."},
    {n:"Обработка кромок",n2:"Все металлические края зашлифованы и завальцованы. Строгое отсутствие заусенцев и острых краев."},
  ]},
  {n:"Несущая конструкция и эргономика",items:[
    {n:"Нагрузочная способность и жесткость",n2:"Статическая нагрузка: не менее 1050 кг. Высокая диагональная жесткость: пустая стойка не должна «гулять» и деформироваться при «тесте на шатание» за противоположные углы."},
    {n:"Соединение стоек",n2:"Наличие крепежных элементов для надежного соединения стоек в единый ряд, придания дополнительной жесткости и предотвращения образования щелей при нагрузке."},
    {n:"Боковые панели",n2:"Разделены по высоте (две и более частей) для удобства снятия одним человеком. Наличие надежных замков/защелок."},
    {n:"Механика дверей",n2:"Гарантированный ресурс работы дверей без появления скрипов, перекосов и деформации петель составляет не менее 100 циклов открывания/закрывания."},
    {n:"Двери и перфорация",n2:"Перфорация не менее 75-80%. Отверстия должны начинаться строго с 1-го юнита (самого низа) до самого верха (без глухих металлических вставок). Профиль двери должен быть плоским (без узорчатых/выпуклых штамповок, тормозящих поток воздуха)."},
    {n:"Изоляция воздушных потоков",n2:"Зазор между фальшполом и нижней рамой не должен превышать 5 см. В противном случае обязательно наличие в комплекте защитной юбки/цоколя для изоляции холодного коридора."},
    {n:"Замки, ручки и уплотнители",n2:"Наличие резиновых уплотнителей для плотного прилегания к раме. Полностью пластиковые ручки запрещены (только металл или пластик с металл. стержнем). Замки с возможностью установки СКУД."},
  ]},
  {n:"Направляющие (19-дюймовые профили)",items:[
    {n:"Механизм регулировки",n2:"Возможность плавного сдвига направляющих по горизонтали (глубине) без необходимости выкручивания избыточного количества болтов в труднодоступных местах."},
    {n:"Совместимость",n2:"Стандартное расстояние EIA-310. Глубокое ИТ-оборудование устанавливается без перекосов."},
  ]},
  {n:"Опоры и мобильность",items:[
    {n:"Ролики (колеса)",n2:"Минимум 4 ролика со стопперами. Динамическая нагрузка должна позволять безопасно катить стойку (не менее 10 метров) при полной загрузке (от 1050 кг) без рывков, заеданий и деформации кронштейнов."},
    {n:"Регулируемые ножки (опоры)",n2:"Прочная резьба. Обязательна возможность регулировки по высоте или выкручивания стандартным гаечным ключом при полной загрузке (от 1050 кг) без «слизывания» резьбы и деформации металла."},
  ]},
  {n:"Функциональное и нагрузочное тестирование",items:[
    {n:"Тест устойчивости (наклон)",n2:"При наклоне гружёной стойки на угол 10-15° конструкция не опрокидывается, оборудование не смещается."},
    {n:"Нагрузочный тест направляющих",n2:"Поочерёдная загрузка нижнего, среднего и верхнего юнита до максимально допустимой нагрузки по паспорту - направляющие не прогибаются, рама сохраняет геометрию."},
    {n:"Тест монтажа глубокого оборудования с PDU",n2:"При установленных PDU глубокий сервер устанавливается без упора в корпус PDU, порты PDU остаются доступны, двери закрываются штатно."},
  ]},
  {n:"Интеграция PDU и кабельный менеджмент",items:[
    {n:"Направляющие для PDU (Zero-U)",n2:"Посадочные места для монтажа 4-х PDU. Наличие рельсов для перемещения PDU по горизонтали и нанесенной шкалы делений для точного отмеривания отступов."},
    {n:"Трассировка кабелей PDU",n2:"Конструкция обеспечивает свободное прохождение силовых кабелей вниз (кабель не должен упираться в раму или пережиматься дверями)."},
    {n:"Крыша и кабельные вводы",n2:"Не менее двух щеточных вводов. Конструкция крыши (модульная или с вводами по краям) должна позволять снимать/демонтировать крышу без необходимости отключения проложенных силовых и патч-кабелей."},
  ]},
  {n:"Изоляция и заземление",items:[
    {n:"Контур заземления",n2:"Интегрированная система заземления с надежной фиксацией болтами (защелки не допускаются). Допускается заземление дверей напрямую через токопроводящие петли (без дополнительных кабелей заземления), если это обеспечивает надежный контакт."},
  ]},
];
const PDU_TECH_SPECS_DEFAULT=[
  {n:"Упаковка, комплектация и документация",items:[
    {n:"Внешний вид упаковки",n2:"Защитный картон + демпфирующий материал (пенопласт/вспененный ПЭ). Отсутствие повреждений при транспортировке."},
    {n:"Внешняя чистота",n2:"Отсутствие пыли, грязи, пятен, следов технических жидкостей или клея от упаковочных пленок на корпусе и внутри розеточных блоков нового устройства."},
    {n:"Маркировка оборудования",n2:"Наличие четкой заводской этикетки (Серийный номер, MAC-адрес, Part Number, ревизия). Сверка данных с самим устройством."},
    {n:"Комплектация (ЗИП)",n2:"Наличие монтажных кронштейнов (для Zero-U) и комплекта крепежных винтов/гаек (cage nuts)."},
    {n:"Документация",n2:"Наличие паспорта устройства, краткого руководства по установке (Quick Start Guide), гарантийного талона."},
  ]},
  {n:"Конструкция и эргономика",items:[
    {n:"Форм-фактор",n2:"Zero-Unit (вертикальный монтаж)"},
    {n:"Габариты корпуса",n2:"Устройство свободно помещается в штатные места тестовой стойки. Не препятствует закрытию дверей и монтажу/демонтажу ИТ-оборудования (серверов, коммутаторов)."},
    {n:"Жесткость конструкции",n2:"Корпус не деформируется под собственным весом и при разборе. При монтаже в стойку устройство зафиксировано жестко, без люфта и покачиваний."},
    {n:"Качество кромок и швов",n2:"Отсутствие заусенцев, острых металлических краев на окантовках, корпусе и возле портов."},
    {n:"Длина кабеля",n2:"Длина не менее 3 метров (достаточно для укладки под фальшпол или в лоток)."},
    {n:"Сечение кабеля",n2:"Сечение соответствует заявленным токам (например, не менее 4-6 мм² для 32А)."},
    {n:"Оплетка вводного кабеля",n2:"Усиленная (резина/полимер), устойчивая к порезам об острые края лотков и изломам на сгибах. Гибкая."},
    {n:"Вилка подключения",n2:"Тип IEC 60309. Качественное литье или сборка вилки, отсутствие люфта контактов, наличие маркировки характеристик на вилке."},
  ]},
  {n:"Электрические характеристики и автоматика",items:[
    {n:"Тип ввода и номинальный ток",n2:"1Ф32А; 3Ф16А; 3Ф32А"},
    {n:"Автоматические выключатели (АВ)",n2:"Наличие АВ на каждую группу розеток/секцию. Номинал АВ соответствует сечению внутренних проводов и типу розеток."},
    {n:"Защита от случайного нажатия АВ",n2:"Наличие конструктивной защиты автоматических выключателей: металлические козырьки, пластиковые шторки или углубленный монтаж (утоплены в корпус)."},
    {n:"Система заземления",n2:"Интегрирована в основной кабель + обязательно наличие внешнего терминала на корпусе для дополнительного выравнивания потенциалов."},
    {n:"УЗИП (Защита от перенапряжений)",n2:"Наличие встроенных варисторов, работоспособность индикатора защиты."},
  ]},
  {n:"Розеточные блоки и коммутация",items:[
    {n:"Количество розеток С13",n2:"30-36 шт."},
    {n:"Количество розеток С19",n2:"6-12 шт."},
    {n:"Качество фиксации кабелей",n2:"Вилки (С14/С20) вставляются с умеренным усилием. Зафиксированный кабель держится плотно, не выпадает под собственным весом, контакт не пропадает при вибрации кабеля."},
    {n:"Маркировка розеток",n2:"Контрастная, стойкая к истиранию маркировка порядковых номеров розеток и секций. Наклейки не допускаются."},
  ]},
  {n:"Функциональное и нагрузочное тестирование",items:[
    {n:"Холостой пуск",n2:"Корректное включение, загрузка контроллера управления, отображение базовых параметров на экране (напряжение) без задержек."},
    {n:"Точность измерений (Мультиметр/Клещи)",n2:"Класс точности не ниже 2.0. Расхождение показаний тока/напряжения на дисплее PDU (и в Web) с поверенными токовыми клещами составляет не более 2%."},
    {n:"Скорость обновления данных",n2:"При резком изменении нагрузки (включение/отключение сервера/пушки) показания на экране и в Web-интерфейсе обновляются без существенных задержек (до 2-3 сек)."},
    {n:"Температурный режим под нагрузкой (1 час)",n2:"Работа PDU под номинальной нагрузкой (по паспорту автомата секции) в течение 1 часа. Тепловизор не фиксирует локальных перегревов кабеля, вилок, корпуса, АВ и внутренних соединений."},
    {n:"Работа при повышенных температурах (1 час)",n2:"Работа PDU в камере с постоянно поддерживаемой температурой 50 градусов в течении 1 часа. Тепловизор не фиксирует локальных перегревов кабеля, вилок, корпуса, АВ и внутренних соединений."},
    {n:'Тест "Перегрузка" - Индикация',n2:"При достижении порога (например, 80-90% от номинала) срабатывает визуальная (смена цвета экрана), звуковая и программная сигнализация."},
    {n:'Тест "Перегрузка" - Отработка АВ',n2:"При превышении номинала автомата происходит его штатное срабатывание (отщелкивание). Прилегающие секции продолжают работу."},
  ]},
  {n:"Физические интерфейсы управления и периферия",items:[
    {n:"Локальная панель управления",n2:"Наличие дисплея (OLED/LCD). Экран расположен в зоне прямой видимости. Кнопки навигации нажимаются четко, без западаний и люфта."},
    {n:"Сетевой интерфейс (Ethernet)",n2:"Наличие разъема Ethernet (RJ-45) 10/100/1000 Mbps. Надежная фиксация коннектора, линк поднимается стабильно, присутствует световая индикация активности порта."},
    {n:"Локальный консольный порт",n2:"Физическое наличие порта (RS-232, RJ-45 или Micro-USB/Type-C) для локального сервисного подключения и настройки."},
    {n:"Порты датчиков (Периферия)",n2:"Наличие заявленных портов для подключения внешних датчиков (температура, влажность, сухие контакты). Надежность фиксации коннекторов датчиков."},
  ]},
  {n:"Программные интерфейсы, мониторинг и логика",items:[
    {n:"Назначение IP-адреса",n2:"Успешное получение IP по DHCP. Возможность задать статический IP через дисплей или консоль (без входа в Web)."},
    {n:"Web-интерфейс (Доступность)",n2:'Наличие встроенного HTTP/HTTPS сервера. Интерфейс загружается быстро, не "зависает", дизайн адаптивен/понятен.'},
    {n:"Локализация Web и меню",n2:'Поддержка русского/английского языка. Отсутствие "иероглифов" и некритичных багов перевода.'},
    {n:"Протоколы удаленного опроса",n2:"Успешная выгрузка метрик по SNMP (v2c/v3). Доступность управления по SSH. Telnet (если включен, проверить возможность отключения в целях безопасности)."},
    {n:"Журналирование (Логи)",n2:"PDU корректно фиксирует в системном логе события: вход пользователя, изменение настроек, аварии питания, перезагрузки контроллера. Возможен экспорт логов (Syslog / FTP / Web)."},
    {n:"Интеграция датчиков в интерфейс",n2:"При подключении физических датчиков данные корректно и без задержек отображаются на дисплее и в Web-интерфейсе."},
    {n:"Обновление прошивки (Firmware)",n2:'Успешное применение файла прошивки. Во время перезагрузки контроллера питание потребителей НЕ должно прерываться ("горячая" замена логики).'},
  ]},
  {n:"Внутренний осмотр и разбор оборудования",items:[
    {n:"Удобство разбора (Метизы)",n2:"Использование качественных винтов (сталь высокой прочности, желательно TORX). Шлицы не срываются («слизываются») при первом выкручивании."},
    {n:"Внутренняя коммутация",n2:"Использование надежных соединений: медные шины, сварка, качественная опрессовка или пайка. Скрутки, пружинные клеммы (WAGO) и дешевый пластик строго запрещены."},
    {n:"Сечение проводников",n2:"Соответствие маркировки пропускаемым токам. Изоляция гибкая, термостойкая, без следов передавливания корпусом."},
    {n:"Фиксация резьбы",n2:"Наличие стопорных шайб или специального фиксатора (лака) на всех силовых клеммах для защиты от вибрации."},
    {n:"Качество пайки",n2:"Поверхность глянцевая. Отсутствие излишков флюса, окисления, наплывов или признаков «холодной» пайки."},
    {n:"Контур заземления",n2:"Целостность внутреннего контура: все металлические части корпуса и контакты розеток объединены в общую шину надежным болтовым соединением."},
    {n:"Внутренняя чистота",n2:"Отсутствие стружки, технологической грязи, остатков изоляции, капель припоя и неочищенного флюса внутри корпуса."},
  ]},
];

function normalizeTechSpecs(data){
  const arr=Array.isArray(data)?data:TECH_SPECS_DEFAULT;
  return arr.map(sec=>({
    ...sec,
    n:sec?.n||"",
    items:(sec?.items||[]).map(it=>({n:it?.n||"",n2:it?.n2||""}))
  }));
}

function HeatmapTh({si,s,active,onSort}){
  const [hov,setHov]=useState(false);
  return <th onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onSort} style={{textAlign:"center",padding:"4px 2px",fontSize:10,fontWeight:active?800:600,color:active?B.blue:B.steel,verticalAlign:"middle",cursor:"pointer",userSelect:"none",transition:"color 0.15s",whiteSpace:"nowrap",position:"relative"}}>{si+1}{hov===true&&<div style={{position:"absolute",bottom:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",background:"#334155",color:"#fff",fontSize:10,padding:"4px 8px",borderRadius:6,whiteSpace:"nowrap",pointerEvents:"none",zIndex:99}}>{s.n}<div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:"5px solid #334155"}}/></div>}</th>;
}

export default function App(){
  const [eqType,setEqType]=useState(()=>localStorage.getItem("rack_eq_type")||"стойка");
  const STORAGE_KEY=`rack_scoring_data_${eqType}`;
  const [sections,setSections]=useState(()=>{
    const eq=localStorage.getItem("rack_eq_type")||"стойка";
    const s=loadSaved(`rack_scoring_data_${eq}`);
    if(s?.sections)return s.sections;
    return eq==="pdu"?PDU_DEFAULT:DEF_SECTIONS;
  });
  const ALL=useMemo(()=>mkAll(sections),[sections]);
  const SEC_OFF=useMemo(()=>mkOff(sections),[sections]);
  const itemCount=ALL.length;

  const [vendors,setVendors]=useState(()=>{
    const eq=localStorage.getItem("rack_eq_type")||"стойка";
    const s=loadSaved(`rack_scoring_data_${eq}`);
    const initialSections=s?.sections||(eq==="pdu"?PDU_DEFAULT:DEF_SECTIONS);
    const initialItemCount=mkAll(initialSections).length;
    if(s?.vendors){
      return s.vendors.map(v=>({...v,images:v.images||Array(initialItemCount).fill(null)}));
    }
    return [{name:"Вендор 1",scores:Array(initialItemCount).fill(null),notes:Array(initialItemCount).fill(""),images:Array(initialItemCount).fill(null)}];
  });
  const [act,setAct]=useState(0);
  const [view,setView]=useState("editor");
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [noteOpen,setNoteOpen]=useState(null);
  const [notePopup,setNotePopup]=useState(null);
  const [infoPopup,setInfoPopup]=useState(null);
  const [showReset,setShowReset]=useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [expImgs,setExpImgs]=useState({});
  const [heatmapSort,setHeatmapSort]=useState({col:null,label:null});
  const [heatmapSelectedVendor, setHeatmapSelectedVendor] = useState(null);
  const techSpecsStorageKey=`rack_tech_specs_${eqType}`;
  const [techSpecs,setTechSpecs]=useState(()=>{
    const eq=localStorage.getItem("rack_eq_type")||"стойка";
    try{
      const raw=localStorage.getItem(`rack_tech_specs_${eq}`);
      if(raw)return JSON.parse(raw);
    }catch{}
    return eq==="pdu"?PDU_TECH_SPECS_DEFAULT:TECH_SPECS_DEFAULT;
  });
  const [techSpecsEditMode,setTechSpecsEditMode]=useState(false);
  const techSpecsSnapshot=useRef(null);
  useEffect(()=>{try{localStorage.setItem(techSpecsStorageKey,JSON.stringify(techSpecs));}catch{}},[techSpecs,techSpecsStorageKey]);
  useEffect(() => {
    const handler = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => { window.removeEventListener('resize', handler); window.removeEventListener('orientationchange', handler); };
  }, []);

  useEffect(()=>{
    try{localStorage.setItem("rack_eq_type",eqType);}catch{}
  },[eqType]);

  /* Auto-save to localStorage on every change */
  useEffect(()=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({sections,vendors}));}catch{}
  },[STORAGE_KEY,sections,vendors]);

  const switchEqType=useCallback((newType)=>{
    if(newType===eqType)return;
    localStorage.setItem("rack_eq_type",newType);
    setEqType(newType);
    try{
      const raw=localStorage.getItem(`rack_scoring_data_${newType}`);
      if(raw){
        const d=JSON.parse(raw);
        if(d.sections)setSections(d.sections);
        if(d.vendors)setVendors(d.vendors.map(v=>({...v,images:v.images||Array(mkAll(d.sections||[]).length).fill(null)})));
      }else{
        const defSecs=newType==="pdu"?PDU_DEFAULT:DEF_SECTIONS;
        setSections(defSecs);
        setVendors([{name:"Вендор 1",scores:Array(mkAll(defSecs).length).fill(null),notes:Array(mkAll(defSecs).length).fill(""),images:Array(mkAll(defSecs).length).fill(null)}]);
      }
    }catch{}
    try{
      const raw=localStorage.getItem(`rack_tech_specs_${newType}`);
      if(raw)setTechSpecs(JSON.parse(raw));
      else setTechSpecs(newType==="pdu"?PDU_TECH_SPECS_DEFAULT:TECH_SPECS_DEFAULT);
    }catch{setTechSpecs(TECH_SPECS_DEFAULT);}
    setAct(0);
    setNoteOpen(null);
  },[eqType]);

  /* Export to Excel (same format as template) */
  const exportExcelFile=useCallback(async()=>{
    try{
      const {default:ExcelJS}=await import("exceljs");
      const wb=new ExcelJS.Workbook();
      const ws=wb.addWorksheet("Оценка");
      const colCount=3+vendors.length*2;

      /* helpers */
      const argb=hex=>"FF"+hex.replace("#","");
      const fill=hex=>({type:"pattern",pattern:"solid",fgColor:{argb:argb(hex)}});
      const fnt=(color,bold=false,size)=>({bold,color:{argb:argb(color)},...(size?{size}:{})});
      const CENTER={horizontal:"center",vertical:"middle"};
      const LEFT={horizontal:"left",vertical:"middle"};

      /* column widths */
      ws.getColumn(1).width=5;
      ws.getColumn(2).width=30;
      ws.getColumn(3).width=18;
      vendors.forEach((_,vi)=>{
        ws.getColumn(4+vi*2).width=12;
        ws.getColumn(5+vi*2).width=22;
      });

      /* ROW 1: title */
      ws.addRow(["ЧЕК-ЛИСТ ТЕСТИРОВАНИЯ СТОЕК"]);
      ws.mergeCells(1,1,1,colCount);
      const tc=ws.getCell(1,1);
      tc.fill=fill("#334155");tc.font=fnt("#FFFFFF",true,13);tc.alignment=CENTER;
      ws.getRow(1).height=26;

      /* ROW 2: headers */
      const hdr=["#","Параметр","Тип"];
      vendors.forEach((v,n)=>{hdr.push(v.name);hdr.push(`Прим. В${n+1}`);});
      ws.addRow(hdr);
      for(let c=1;c<=colCount;c++){
        const cell=ws.getCell(2,c);
        cell.fill=fill("#334155");cell.font=fnt("#FFFFFF",true);cell.alignment=CENTER;
      }
      ws.getRow(2).height=18;

      /* data rows */
      let gi=0;
      let rowNum=3;
      sections.forEach(sec=>{
        /* section header */
        ws.addRow([sec.n]);
        ws.mergeCells(rowNum,1,rowNum,colCount);
        const sc=ws.getCell(rowNum,1);
        sc.fill=fill("#2F9AFF");sc.font=fnt("#FFFFFF",true);sc.alignment=CENTER;
        ws.getRow(rowNum).height=16;
        rowNum++;

        sec.items.forEach(it=>{
          const typeStr=it.w===2?"★! Требование":it.w===1?"★ Требование":"☆ Преимущество";
          const isReq=it.w>=1;
          const altBg=gi%2===0?"#F5F8FB":"#FFFFFF";

          const cleanNote=(str)=>{if(!str)return'';return str.replace(/<[^>]*>/g,'').trim();};
          const rowData=[gi+1,it.n,typeStr];
          vendors.forEach(v=>{
            rowData.push(v.scores[gi]!=null?v.scores[gi]:"");
            rowData.push(cleanNote(v.notes[gi]));
          });
          ws.addRow(rowData);
          ws.getRow(rowNum).height=15;

          /* A: number */
          const ca=ws.getCell(rowNum,1);
          ca.font=fnt("#7B97B2");ca.alignment=CENTER;

          /* B: name */
          const cb=ws.getCell(rowNum,2);
          cb.font=fnt("#334155");cb.alignment=LEFT;

          /* C: type */
          const cc=ws.getCell(rowNum,3);
          cc.fill=isReq?fill("#FEE2E2"):fill("#DBEAFE");
          cc.font=isReq?fnt("#DC2626",true):fnt("#2F9AFF",true);
          cc.alignment=CENTER;

          /* score + note cols */
          vendors.forEach((_,vi)=>{
            const sc2=ws.getCell(rowNum,4+vi*2);
            sc2.fill=fill(altBg);sc2.alignment=CENTER;
            const nc=ws.getCell(rowNum,5+vi*2);
            nc.fill=fill(altBg);nc.font=fnt("#7B97B2");
          });

          rowNum++;gi++;
        });
      });

      /* download */
      const buffer=await wb.xlsx.writeBuffer();
      const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download="scoring_export.xlsx";a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(err){
      console.error(err);
      alert("Ошибка экспорта Excel: "+err.message);
    }
  },[sections,vendors]);

  /* Import JSON or XLSX */
  const importFile=useCallback(()=>{
    const input=document.createElement("input");
    input.type="file";input.accept=".json,.xlsx,.xls";
    input.onchange=async e=>{
      const file=e.target.files[0];if(!file)return;
      const ext=file.name.split(".").pop().toLowerCase();

      if(ext==="json"){
        const reader=new FileReader();
        reader.onload=ev=>{
          try{
            const d=JSON.parse(ev.target.result);
            if(d.sections&&Array.isArray(d.sections)){setSections(d.sections);}
            if(d.vendors&&Array.isArray(d.vendors)){setVendors(d.vendors.map(v=>({...v,images:v.images||Array(mkAll(d.sections||sections).length).fill(null)})));}
            setAct(0);setView("editor");
          }catch{alert("Ошибка чтения JSON");}
        };
        reader.readAsText(file);
        return;
      }

      /* XLSX parsing with SheetJS */
      try{
        const buf=await file.arrayBuffer();
        const wb=XLSX.read(buf,{type:"array"});
        const wsName=wb.SheetNames.find(n=>n==="Оценка")||wb.SheetNames[0];
        const ws=wb.Sheets[wsName];
        const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});

        /* Row 0 = title (skip), Row 1 = headers */
        const hdr=data[1]||[];

        /* Vendor columns: vendor name at col 3, 5, 7... note at col+1 */
        const vendorCols=[];
        for(let c=3;c<hdr.length;c+=2){
          const name=String(hdr[c]||"").trim();
          if(name)vendorCols.push({name,scoreCol:c,noteCol:c+1});
        }
        if(vendorCols.length===0){alert("Не найдены колонки вендоров");return;}

        /* Parse sections and items from row 2 onward */
        const newSections=[];
        let curSec=null;
        for(let r=2;r<data.length;r++){
          const row=data[r];
          if(!row||row.every(c=>c===""||c==null))continue;
          const colA=row[0];
          const colB=String(row[1]||"").trim();
          const aNum=Number(colA);

          /* Section header: col A is non-empty non-number, col B is empty */
          if(colA&&isNaN(aNum)&&colB===""){
            curSec={n:String(colA).trim(),items:[]};
            newSections.push(curSec);
            continue;
          }

          /* Item row: col A is a positive integer */
          if(!isNaN(aNum)&&aNum>0){
            const colC=String(row[2]||"");
            const w=colC.includes("!")?2:colC.includes("★")?1:0;
            if(!curSec){curSec={n:"Раздел",items:[]};newSections.push(curSec);}
            curSec.items.push({n:String(row[1]||"").trim(),w});
          }
        }

        if(newSections.length===0||newSections.every(s=>s.items.length===0)){
          alert("Не удалось распознать структуру файла");return;
        }

        /* Build vendor score/note arrays */
        const totalItems=newSections.reduce((a,s)=>a+s.items.length,0);
        const newVendors=vendorCols.map(vn=>{
          const scores=Array(totalItems).fill(null);
          const notes=Array(totalItems).fill("");
          const images=Array(totalItems).fill(null);
          let idx=0;
          for(let r=2;r<data.length;r++){
            const row=data[r];
            if(!row)continue;
            const aNum=Number(row[0]);
            if(isNaN(aNum)||aNum<=0)continue; /* skip title, header, section rows */
            if(idx>=totalItems)break;
            const rawScore=row[vn.scoreCol];
            if(rawScore!=null&&rawScore!==""){
              const num=Number(rawScore);
              if(!isNaN(num)&&num>=0&&num<=2)scores[idx]=num;
            }
            const rawNote=String(row[vn.noteCol]||"").trim();
            if(rawNote)notes[idx]=rawNote;
            idx++;
          }
          return{name:vn.name,scores,notes,images};
        });

        setSections(newSections);
        setVendors(newVendors);
        setAct(0);setView("input");
      }catch(err){
        console.error(err);
        alert("Ошибка чтения Excel: "+err.message);
      }
    };
    input.click();
  },[sections]);

  const exportTechSpecs=useCallback(async()=>{
    try{
      await exportTechSpecsXlsx({ techSpecs, eqType });
    }catch(err){
      console.error(err);
      alert("Ошибка экспорта: "+err.message);
    }
  },[techSpecs,eqType]);

  const importTechSpecs=useCallback(()=>{
    const input=document.createElement("input");
    input.type="file";
    input.accept=".json,.xlsx,.xls";
    input.onchange=async e=>{
      const file=e.target.files[0];
      if(!file)return;
      const ext=file.name.split(".").pop().toLowerCase();

      if(ext==="json"){
        const reader=new FileReader();
        reader.onload=ev=>{
          try{
            const d=JSON.parse(ev.target.result);
            if(Array.isArray(d))setTechSpecs(normalizeTechSpecs(d));
            else alert("Неверный формат файла");
          }catch{alert("Ошибка чтения JSON");}
        };
        reader.readAsText(file);
        return;
      }

      try{
        const buf=await file.arrayBuffer();
        const wb=XLSX.read(buf,{type:"array"});
        const wsName=wb.SheetNames.find(n=>n==="ТУ")||wb.SheetNames[0];
        const ws=wb.Sheets[wsName];
        const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});

        const newSpecs=[];
        let curSec=null;
        for(let r=0;r<data.length;r++){
          const row=Array.isArray(data[r])?data[r]:[];
          const col0Raw=row[0];
          const col1Raw=row[1];
          const col2Raw=row[2];
          const col0=String(col0Raw??"").trim();
          const col1=String(col1Raw??"").trim();
          const col2=String(col2Raw??"").trim();
          const col1Empty=col1===""||Number.isNaN(col1Raw);
          const col2Empty=col2===""||Number.isNaN(col2Raw);
          const col0Numeric=col0!==""&&!Number.isNaN(Number(col0));

          if(col0==="#" )continue;

          if(col1Empty&&col0!==""&&col0!=="#"){
            curSec={n:col0,items:[]};
            newSpecs.push(curSec);
            continue;
          }

          if(col0Numeric&&!col1Empty&&curSec){
            curSec.items.push({n:col1,n2:col2Empty?"":col2});
          }
        }

        const validSpecs=newSpecs.filter(sec=>Array.isArray(sec.items)&&sec.items.length>0);
        if(validSpecs.length===0){
          alert("Не удалось распознать структуру ТУ: в файле не найдено ни одного корректного раздела с параметрами.");
          return;
        }
        setTechSpecs(normalizeTechSpecs(validSpecs));
        // Auto-sync sections from loaded tech specs, preserving weights from current defaults
        const defaultSecs = eqType === "pdu" ? PDU_DEFAULT : DEF_SECTIONS;
        const syncedSections = validSpecs.map(sec => {
          const defSec = defaultSecs.find(s => s.n === sec.n);
          return {
            n: sec.n,
            items: sec.items.map(it => {
              const defItem = defSec?.items?.find(x => x.n === it.n);
              return { n: it.n, w: defItem?.w ?? 1 };
            })
          };
        });
        const totalItems = syncedSections.reduce((a,s) => a + s.items.length, 0);
        setSections(syncedSections);
        setVendors(v => v.map(vnd => ({
          ...vnd,
          scores: Array(totalItems).fill(null),
          notes: Array(totalItems).fill(""),
          images: Array(totalItems).fill(null)
        })));
        alert(`✓ Загружено: разделов ${validSpecs.length}, параметров ${validSpecs.reduce((a,s)=>a+s.items.length,0)}`);
      }catch(err){
        alert("Ошибка чтения XLSX: "+err.message);
      }
    };
    input.click();
  },[eqType]);

  /* Reset vendor scores and notes (keeps sections/structure) */
  const doReset=useCallback(()=>{
    setVendors([{name:"Вендор 1",scores:Array(itemCount).fill(null),notes:Array(itemCount).fill(""),images:Array(itemCount).fill(null)}]);
    setShowReset(false);
    setNoteOpen(null);
    setAct(0);
  },[itemCount]);

  /* Export to Excel (CSV with BOM for proper Cyrillic in Excel) */
  /* Generate clean PDF report for a specific vendor */
  const exportVendorPDF=useCallback((vi)=>{
    const v=vendors[vi];
    if(!v)return;
    const allItems=mkAll(sections);
    const offs=mkOff(sections);
    const sl=["✗ Нет","◐ Частично","✓ Да"];
    const sc_colors=["#EF4444","#F59E0B","#10B981"];
    const total=calcTotal(v.scores,allItems);
    const esc=(str)=>String(str??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

    let html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(v.name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet">
    <style>
      *{
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Inter,system-ui,sans-serif;color:#334155;padding:32px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.5}
      h1{font-size:22px;font-weight:800;margin-bottom:16px}
      .total{display:inline-block;padding:8px 20px;border-radius:12px;font-size:20px;font-weight:800;color:#fff;margin-bottom:28px}
      .sec{background:#334155;color:#fff;padding:8px 14px;font-size:12px;font-weight:700;border-radius:8px 8px 0 0;margin-top:14px}
      .items{border:1px solid #E5EAF0;border-top:none;border-radius:0 0 8px 8px;margin-bottom:2px}
      .row{padding:8px 14px;border-bottom:1px solid #F1F5F9}
      .row:last-child{border-bottom:none}
      .rhead{display:flex;gap:10px;align-items:baseline}
      .rname{flex:1;font-size:12px;font-weight:500}
      .rtype{font-size:10px;font-weight:700}
      .rscore{font-size:12px;font-weight:700;flex-shrink:0;text-align:right}
      .note{display:block;background:#F5F8FB;border-radius:6px;padding:4px 10px;font-size:11px;color:#7B97B2;margin-top:4px;white-space:pre-wrap;display:block;text-align:left}.note ul{list-style:disc;padding-left:18px;margin:4px 0}.note ol{list-style:decimal;padding-left:18px;margin:4px 0}.note li{margin:2px 0}.note strong{font-weight:700}.note em{font-style:italic}.note s{text-decoration:line-through}
      .photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
      .photos img{max-width:48%;max-height:240px;border-radius:6px;border:1px solid #E5EAF0;object-fit:contain}
      .summary{margin-top:28px;border:1px solid #E5EAF0;border-radius:10px;overflow:hidden}
      .srow{display:flex;justify-content:space-between;padding:6px 14px;font-size:12px}
      .srow:nth-child(even){background:#F5F8FB}
      .sn{color:#7B97B2}.sv{font-weight:700}
      .pdf-btn{display:block;margin:0 auto 24px;padding:10px 20px;border-radius:12px;border:1.5px dashed #CBD5E1;background:#F8FAFC;color:#7B97B2;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,system-ui,sans-serif;transition:all 0.2s ease}
      .pdf-btn:hover{border:1.5px solid #2F9AFF;background:#EFF6FF;color:#2F9AFF}
      .sec-block{break-inside:avoid}
      .row{break-inside:avoid}
      @media print{body{padding:16px}.pdf-btn{display:none!important}}
    </style></head><body>`;

    html+=`<button class="pdf-btn" onclick="window.print()">Сохранить в PDF</button>`;
    html+=`<h1>${esc(v.name)}</h1>`;
    const tColor=total!=null&&total>=7?"#10B981":total!=null&&total>=4?"#F59E0B":"#7B97B2";
    html+=`<div class="total" style="background:${tColor}">${fmt(total)} / 10</div>`;

    let gi=0;
    sections.forEach((sec,si)=>{
      html+=`<div class="sec-block"><div class="sec">${esc(sec.n)}</div><div class="items">`;
      sec.items.forEach((it,ii)=>{
        const sc=v.scores[gi];
        const nt=v.notes[gi]||"";
        const imgs=v.images?.[gi]||null;
        const isReq=it.w>=1;
        const isCrit=it.w===2;
        const star=isCrit?`<span class="rtype" style="color:#DC2626">★!</span>`:isReq?`<span class="rtype" style="color:#DC2626">★</span>`:`<span class="rtype" style="color:#2F9AFF">☆</span>`;
        let scoreLabel="—";let scoreColor="#CBD5E1";
        if(sc!=null){
          scoreLabel=sl[sc];scoreColor=sc_colors[sc];
        }
        html+=`<div class="row"><div class="rhead">${star}<span class="rname">${esc(it.n)}</span><span class="rscore" style="color:${scoreColor}">${scoreLabel}</span></div>`;
        if(nt)html+=`<div class="note">${nt}</div>`;
        if(imgs&&imgs.length){
          html+=`<div class="photos">`;
          imgs.forEach(im=>{html+=`<img src="${im.data}" alt="${esc(im.name||"")}">`;});
          html+=`</div>`;
        }
        html+=`</div>`;
        gi++;
      });
      html+=`</div></div>`;
    });

    html+=`<div class="summary" style="break-inside:avoid">`;
    html+=`<div class="srow" style="background:#334155;color:#fff;font-weight:700"><span>Раздел</span><span>Балл</span></div>`;
    sections.forEach((sec,si)=>{
      const val=calcSec(v.scores,si,sections,offs);
      html+=`<div class="srow"><span class="sn">${esc(sec.n)}</span><span class="sv">${fmt(val)}</span></div>`;
    });
    html+=`<div class="srow" style="border-top:2px solid #E5EAF0;font-weight:700"><span>ИТОГО</span><span style="color:${tColor}">${fmt(total)}</span></div>`;
    html+=`</div></body></html>`;

    const w=window.open("","_blank");
    if(!w){
      alert("Не удалось открыть окно печати. Разрешите всплывающие окна для этого сайта.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    const closePrintWindow=()=>{try{w.close();}catch{}};
    w.onafterprint=closePrintWindow;
    setTimeout(()=>{
      try{
        w.focus();
        w.print();
      }catch{
        closePrintWindow();
      }
    },500);
  },[sections,vendors]);

  const setSectionName=(si,name)=>{const n=sections.map((s,i)=>i===si?{...s,n:name}:s);setSections(n);};
  const addSection=()=>{
    const newSection={n:"Новый раздел",items:[{n:"Параметр 1",w:2}]};
    const insertAt=itemCount;
    const blockLen=newSection.items.length;
    setSections([...sections,newSection]);
    setVendors(prev=>prev.map(v=>{
      const scores=[...v.scores];
      const notes=[...v.notes];
      const images=[...(v.images||[])];
      scores.splice(insertAt,0,...Array(blockLen).fill(null));
      notes.splice(insertAt,0,...Array(blockLen).fill(""));
      images.splice(insertAt,0,...Array(blockLen).fill(null));
      return {...v,scores,notes,images};
    }));
  };
  const rmSection=(si)=>{
    if(sections.length<=1)return;
    const absIdx=SEC_OFF[si];
    const blockLen=sections[si].items.length;
    const n=sections.filter((_,i)=>i!==si);
    setSections(n);
    setVendors(prev=>prev.map(v=>{
      const scores=[...v.scores];
      const notes=[...v.notes];
      const images=[...(v.images||[])];
      scores.splice(absIdx,blockLen);
      notes.splice(absIdx,blockLen);
      images.splice(absIdx,blockLen);
      return {...v,scores,notes,images};
    }));
  };
  const setItemName=(si,ii,name)=>{const n=sections.map((s,i)=>i===si?{...s,items:s.items.map((it,j)=>j===ii?{...it,n:name}:it)}:s);setSections(n);};
  const setItemWeight=(si,ii,w)=>{const n=sections.map((s,i)=>i===si?{...s,items:s.items.map((it,j)=>j===ii?{...it,w}:it)}:s);setSections(n);};
  const addItem=(si,ii)=>{
    const insertIdx=ii==null?sections[si].items.length-1:ii;
    const absIdx=SEC_OFF[si]+insertIdx+1;
    const n=sections.map((s,i)=>i===si?{...s,items:[...s.items.slice(0,insertIdx+1),{n:"Новый параметр",w:2},...s.items.slice(insertIdx+1)]}:s);
    setSections(n);
    setVendors(prev=>prev.map(v=>{
      const scores=[...v.scores];
      const notes=[...v.notes];
      const images=[...(v.images||[])];
      scores.splice(absIdx,0,null);
      notes.splice(absIdx,0,"");
      images.splice(absIdx,0,null);
      return {...v,scores,notes,images};
    }));
  };
  const rmItem=(si,ii)=>{
    if(sections[si].items.length<=1)return;
    const absIdx=SEC_OFF[si]+ii;
    const n=sections.map((s,i)=>i===si?{...s,items:s.items.filter((_,j)=>j!==ii)}:s);
    setSections(n);
    setVendors(prev=>prev.map(v=>{
      const scores=[...v.scores];
      const notes=[...v.notes];
      const images=[...(v.images||[])];
      scores.splice(absIdx,1);
      notes.splice(absIdx,1);
      images.splice(absIdx,1);
      return {...v,scores,notes,images};
    }));
  };

  const addV=()=>{if(vendors.length>=25)return;setVendors(p=>[...p,{name:`Вендор ${p.length+1}`,scores:Array(itemCount).fill(null),notes:Array(itemCount).fill(""),images:Array(itemCount).fill(null)}]);};
  const rmV=i=>{if(vendors.length<=1)return;setVendors(p=>p.filter((_,j)=>j!==i));if(act>=vendors.length-1&&act>0)setAct(act-1);};
  const setScore=useCallback((idx,val)=>{setVendors(p=>{const n=[...p];const v={...n[act],scores:[...n[act].scores]};v.scores[idx]=v.scores[idx]===val?null:val;n[act]=v;return n;});},[act]);
  const setNote=useCallback((idx,html)=>{const clean=html.replace(/<br\s*\/?>/gi,'').replace(/<div><\/div>/gi,'').trim();const final=clean===''?'':html;setVendors(p=>{const n=[...p];const v={...n[act],notes:[...n[act].notes]};v.notes[idx]=final;n[act]=v;return n;});},[act]);
  const addImage=useCallback((idx,name,dataUrl,isFile=false,isImg=false,isVid=false)=>{setVendors(p=>{const n=[...p];const v={...n[act],images:[...(n[act].images||[])]};const arr=v.images[idx]||[];v.images[idx]=[...arr,{name,data:dataUrl,isFile,isImg,isVid}];n[act]=v;return n;});},[act]);
  const rmImage=useCallback((idx,imgIdx)=>{setVendors(p=>{const n=[...p];const v={...n[act],images:[...(n[act].images||[])]};const arr=[...(v.images[idx]||[])];arr.splice(imgIdx,1);v.images[idx]=arr.length?arr:null;n[act]=v;return n;});},[act]);
  const setName=(i,nm)=>{setVendors(p=>{const n=[...p];n[i]={...n[i],name:nm};return n;});};

  const totals=useMemo(()=>vendors.map(v=>calcTotal(v.scores,ALL)),[vendors,ALL]);
  const fails=useMemo(()=>vendors.map(v=>hasFail(v.scores,ALL)),[vendors,ALL]);
  const advCounts=useMemo(()=>vendors.map(v=>ALL.filter((it,i)=>it.w===0&&v.scores[i]!=null&&v.scores[i]>0).length),[vendors,ALL]);
  const ranks=useMemo(()=>{
    /* Build sorted order: primary=total desc, secondary=advantages desc, tertiary=index asc */
    const indexed=vendors.map((_,i)=>i).filter(i=>totals[i]!=null);
    indexed.sort((a,b)=>{
      const ta=totals[a],tb=totals[b];
      if(tb!==ta)return tb-ta;
      return advCounts[b]-advCounts[a];
    });
    /* Assign strict 1/2/3 to top 3 positions regardless of ties */
    const result=Array(vendors.length).fill(null);
    [0,1,2].forEach(pos=>{if(indexed[pos]!=null)result[indexed[pos]]=pos+1;});
    return result;
  },[totals,advCounts,vendors]);
  const allSec=useMemo(()=>vendors.map(v=>sections.map((_,si)=>calcSec(v.scores,si,sections,SEC_OFF))),[vendors,sections,SEC_OFF]);

  const sortedIdx=useMemo(()=>{
    const arr=vendors.map((_,i)=>i);
    arr.sort((a,b)=>{const ta=totals[a],tb=totals[b];if(ta==null&&tb==null)return a-b;if(ta==null)return 1;if(tb==null)return -1;return tb-ta;});
    return arr;
  },[vendors,totals]);

  const heatmapSortedIdx=useMemo(()=>{
    const arr=vendors.map((_,i)=>i);
    arr.sort((a,b)=>{
      const va=heatmapSort.col===null?totals[a]:(allSec[a]?allSec[a][heatmapSort.col]:0);
      const vb=heatmapSort.col===null?totals[b]:(allSec[b]?allSec[b][heatmapSort.col]:0);
      const na=va==null?-1:va,nb=vb==null?-1:vb;
      if(nb!==na)return nb-na;
      return a-b;
    });
    return arr;
  },[vendors,totals,allSec,heatmapSort]);

  const getAdvantages=(sc)=>ALL.flatMap((it,i)=>it.w===0&&sc[i]!=null&&sc[i]>0?[{...it,idx:i}]:[]);
  const filled=sc=>sc.filter(x=>x!=null).length;

  const resetHeatmapPrintScroll=useCallback(()=>{
    if(typeof document==="undefined")return;
    document.querySelectorAll(".heatmap-table-wrap").forEach((el)=>{el.scrollLeft=0;});
  },[]);

  useEffect(()=>{
    const handleBeforePrint=()=>{resetHeatmapPrintScroll();};
    window.addEventListener("beforeprint",handleBeforePrint);
    return ()=>window.removeEventListener("beforeprint",handleBeforePrint);
  },[resetHeatmapPrintScroll]);

  useEffect(()=>{
    if(infoPopup===null)return;
    const close=()=>setInfoPopup(null);
    window.addEventListener("click",close,{once:true});
    return ()=>window.removeEventListener("click",close);
  },[infoPopup]);

  const exportPDF=useCallback(()=>{
    resetHeatmapPrintScroll();
    window.print();
  },[resetHeatmapPrintScroll]);

  const wbBadge=(w)=>{const wc=WC[w]||WC[1];return{fontSize:11,fontWeight:700,color:wc.c,whiteSpace:"nowrap",flexShrink:0,lineHeight:1};};
  const getTechReq=(secName,itemName)=>{
    const sec=techSpecs.find(s=>s.n===secName);
    const item=sec?.items?.find(x=>x.n===itemName);
    return item?.n2||"";
  };
  const navBtn=(label,v)=><button className="btn-nav" onClick={()=>setView(v)} style={{padding:"10px 16px",borderRadius:20,border:"none",cursor:"pointer",background:view===v?B.blue:"transparent",color:view===v?"#fff":B.steel,fontSize:13,fontWeight:600,transition:"all 0.2s",whiteSpace:"nowrap"}}>{label}</button>;
  const moveSection=(si,dir)=>{
    const newIdx=si+dir;
    if(newIdx<0||newIdx>=sections.length)return;
    const oldOffs=mkOff(sections);
    const newSections=(()=>{const a=[...sections];[a[si],a[newIdx]]=[a[newIdx],a[si]];return a;})();
    setSections(newSections);
    setVendors(prev=>prev.map(v=>{
      const sc=[],nt=[],im=[];
      for(let i=0;i<newSections.length;i++){
        const sec=newSections[i];
        let origIdx=-1;
        for(let j=0;j<sections.length;j++){
          if(sections[j]===sec){
            origIdx=j;
            break;
          }
        }
        if(origIdx<0)continue;
        const off=oldOffs[origIdx];
        for(let k=0;k<sec.items.length;k++){sc.push(v.scores[off+k]??null);nt.push(v.notes[off+k]??"");im.push(v.images?.[off+k]??null);}
      }
      return{...v,scores:sc,notes:nt,images:im};
    }));
  };
  const moveItem=(si,ii,dir)=>{
    const newIdx=ii+dir;
    if(newIdx<0||newIdx>=sections[si].items.length)return;
    setSections(p=>p.map((s,i)=>i===si?{...s,items:(()=>{const a=[...s.items];[a[ii],a[newIdx]]=[a[newIdx],a[ii]];return a;})()}:s));
    const off=SEC_OFF[si];
    setVendors(prev=>prev.map(v=>{
      const sc=[...v.scores];const nt=[...v.notes];const im=[...(v.images||[])];
      const[ms]=sc.splice(off+ii,1);const[mn]=nt.splice(off+ii,1);const[mi]=im.splice(off+ii,1);
      const insertIdx=off+(newIdx>ii?newIdx-1:newIdx);
      sc.splice(insertIdx,0,ms);nt.splice(insertIdx,0,mn);im.splice(insertIdx,0,mi??null);
      return{...v,scores:sc,notes:nt,images:im};
    }));
  };
  const moveTechSection=(si,dir)=>{
    const newIdx=si+dir;
    if(newIdx<0||newIdx>=techSpecs.length)return;
    setTechSpecs(p=>{const a=[...p];[a[si],a[newIdx]]=[a[newIdx],a[si]];return a;});
  };
  const moveTechItem=(si,ii,dir)=>{
    const newIdx=ii+dir;
    if(newIdx<0||newIdx>=techSpecs[si].items.length)return;
    setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:(()=>{const a=[...s.items];[a[ii],a[newIdx]]=[a[newIdx],a[ii]];return a;})()}:s));
  };
  return <div style={{minHeight:"100vh",background:B.bg,fontFamily:"Inter, system-ui, sans-serif",position:"relative",overflowX:"hidden"}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet"/>

    

    <NotePopup note={notePopup} onClose={()=>setNotePopup(null)}/>

    {/* Reset confirmation modal */}
    {showReset&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}} onClick={()=>setShowReset(false)}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"28px 32px",maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",textAlign:"center"}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:"#FEE2E2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div style={{fontSize:16,fontWeight:700,color:B.graphite,marginBottom:8}}>Сбросить всё?</div>
        <div style={{fontSize:13,color:B.steel,marginBottom:24,lineHeight:"1.5"}}>Все вендоры, оценки и примечания будут удалены. Останется один пустой «Вендор 1». Структура разделов сохранится.</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button className="btn-secondary" onClick={()=>setShowReset(false)} style={{padding:"10px 28px",borderRadius:12,border:`1.5px solid ${B.border}`,background:"#fff",color:B.graphite,fontSize:14,fontWeight:600,cursor:"pointer"}}>Отмена</button>
          <button className="btn-primary" onClick={doReset} style={{padding:"10px 28px",borderRadius:12,border:"none",background:"#EF4444",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Да, сбросить</button>
        </div>
      </div>
    </div>}

    {showApplyConfirm && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}} onClick={()=>setShowApplyConfirm(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"28px 32px",maxWidth:400,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",textAlign:"center"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"#DBEAFE",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={B.blue} strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div style={{fontSize:16,fontWeight:700,color:B.graphite,marginBottom:8}}>Применить в редактор?</div>
          <div style={{fontSize:13,color:B.steel,marginBottom:24,lineHeight:"1.5"}}>Разделы и параметры в редакторе будут обновлены из тех. условий. Веса новых параметров будут установлены как «Преимущество». Существующие веса сохранятся.</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button type="button" className="btn-secondary" onClick={()=>setShowApplyConfirm(false)} style={{padding:"10px 28px",borderRadius:12,border:`1.5px solid ${B.border}`,background:"#fff",color:B.graphite,fontSize:14,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>Отмена</button>
            <button type="button" className="btn-primary" onClick={()=>{
              const newSections = techSpecs.map(sec => ({
                n: sec.n,
                items: sec.items.map(it => {
                  const existing = sections.find(s=>s.n===sec.n)?.items?.find(x=>x.n===it.n);
                  return { n: it.n, w: existing?.w ?? 0 };
                })
              }));
              const totalItems = newSections.reduce((a,s)=>a+s.items.length,0);
              setSections(newSections);
              setVendors(v => v.map(vnd => ({
                ...vnd,
                scores: Array(totalItems).fill(null),
                notes: Array(totalItems).fill(""),
                images: Array(totalItems).fill(null)
              })));
              setShowApplyConfirm(false);
              setTechSpecsEditMode(false);
            }} style={{padding:"10px 28px",borderRadius:12,border:"none",background:B.blue,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
              Применить
            </button>
          </div>
        </div>
      </div>
    )}

    {/* NAV */}
    <div data-nav="" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 24px",background:"#fff",borderBottom:`1px solid ${B.border}`,position:"sticky",top:0,zIndex:50,gap:8,flexWrap:"wrap"}}>
      <div className="nav-left-group" style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Logo h={26}/>
          <div style={{width:1,height:22,background:B.border}}/>
          <span className="nav-nits" style={{fontSize:13,fontWeight:700,color:B.graphite,letterSpacing:"0.5px"}}>НИТС</span>
        </div>
        <div className="nav-tabs" style={{display:"flex",gap:3,background:"#F1F5F9",borderRadius:20,padding:2}}>
          <div style={{
            overflow:"hidden",
            maxWidth: (view==="techspecs"||view==="editor") ? 150 : 0,
            opacity: (view==="techspecs"||view==="editor") ? 1 : 0,
            transition:"max-width 0.3s ease, opacity 0.3s ease",
            display:"inline-flex",
            pointerEvents: (view==="techspecs"||view==="editor") ? "auto" : "none",
          }}>
            {navBtn("Редактор","editor")}
          </div>
          {navBtn("Тех. условия","techspecs")}{navBtn("Оценка","input")}{navBtn("Дашборд","dashboard")}
        </div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        {view==="dashboard"&&<button className="btn-add-vendor" onClick={exportPDF} style={{padding:"6px 14px",borderRadius:12,border:"1.5px dashed #CBD5E1",background:"#F8FAFC",color:"#7B97B2",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>PDF</button>}
      </div>
    </div>

    {/* ═══ EDITOR ═══ */}
    {view==="editor"&&<div className="view-section-pad" style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8,paddingBottom:12,borderBottom:`1px solid ${B.border}`}}>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:16,fontWeight:700,color:B.graphite}}>Редактор чек-листа</div>
          <div style={{fontSize:12,color:B.steel,marginTop:2}}>Настройте разделы, параметры и веса перед оценкой</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <button className="btn-secondary" onClick={importFile} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Загрузить
          </button>
          <button className="btn-action" onClick={exportExcelFile} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.blue}`,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Сохранить
          </button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {EQ_TYPES.map(t=>
          <button key={t} onClick={()=>switchEqType(t)} style={{padding:"6px 16px",borderRadius:12,border:`1.5px solid ${eqType===t?B.blue:B.border}`,background:eqType===t?"#EFF6FF":"#fff",color:eqType===t?B.blue:B.steel,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {t==="стойка"?"Стойка":"PDU"}
          </button>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"flex-start",marginBottom:12}}>
        <button className="btn-add-vendor" onClick={addSection} style={{padding:"6px 14px",borderRadius:12,border:"1.5px dashed #CBD5E1",background:"#F8FAFC",color:"#7B97B2",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Раздел</button>
      </div>
      {sections.map((sec,si)=>
        <div key={si} style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",borderLeft:`3px solid ${VC[si%VC.length]}`}}>
            <div style={{display:"flex",gap:3,marginRight:4,flexShrink:0}}>
              <button type="button" className="btn-icon" onClick={()=>moveSection(si,-1)} disabled={si===0} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:si===0?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:si===0?0.3:1,padding:0}}>↑</button>
              <button type="button" className="btn-icon" onClick={()=>moveSection(si,1)} disabled={si===sections.length-1} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:si===sections.length-1?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:si===sections.length-1?0.3:1,padding:0}}>↓</button>
            </div>
            <input value={sec.n} onChange={e=>setSectionName(si,e.target.value)} style={{flex:1,background:"transparent",border:"none",color:"#fff",fontSize:13,fontWeight:700,outline:"none",minWidth:0}}/>
            {sections.length>1&&<button type="button" className="btn-icon-close" onClick={()=>rmSection(si)} style={{background:"none",border:"none",color:"#ffffff88",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0}}>×</button>}
          </div>
          <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
            {sec.items.map((it,ii)=>
              <div key={ii} style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,padding:"8px 16px",borderTop:ii?`1px solid #F1F5F9`:"none"}}>
                <div style={{display:"flex",gap:3,marginRight:4,flexShrink:0}}>
                  <button type="button" className="btn-icon" onClick={()=>moveItem(si,ii,-1)} disabled={ii===0} style={{width:20,height:20,borderRadius:3,border:"0.5px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:ii===0?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:ii===0?0.3:1,padding:0}}>↑</button>
                  <button type="button" className="btn-icon" onClick={()=>moveItem(si,ii,1)} disabled={ii===sec.items.length-1} style={{width:20,height:20,borderRadius:3,border:"0.5px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:ii===sec.items.length-1?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:ii===sec.items.length-1?0.3:1,padding:0}}>↓</button>
                </div>
                <textarea value={it.n} onChange={e=>{setItemName(si,ii,e.target.value);e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}} onFocus={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}} rows={1} style={{flex:1,border:"none",background:"none",fontSize:12,color:B.graphite,outline:"none",minWidth:0,resize:"none",overflow:"hidden",fontFamily:"Inter, system-ui, sans-serif",lineHeight:"1.4",padding:0}} placeholder="Название параметра"/>
                <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  <button type="button" className="btn-score" onClick={()=>setItemWeight(si,ii,it.w===2?1:2)} style={{width:28,height:28,borderRadius:8,border:it.w===2?`2px solid #DC2626`:`2px solid ${B.border}`,background:it.w===2?"#FEE2E2":"#fff",cursor:"pointer",fontSize:13,fontWeight:800,color:it.w===2?"#DC2626":B.steel,display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",visibility:it.w>=1?"visible":"hidden"}} title="Критичный параметр (×2)">!</button>
                  {[{w:1},{w:0}].map(({w:wv})=>{
                    const on=wv===0?it.w===0:(it.w>=1);
                    const wc=WC[wv];
                    const star=wv===0?"☆":"★";
                    return <button type="button" className="btn-score" key={wv} onClick={()=>setItemWeight(si,ii,wv===0?0:1)} style={{padding:"4px 10px",borderRadius:8,border:on?`2px solid ${wc.bc}`:`2px solid ${B.border}`,background:on?wc.bg:"#fff",cursor:"pointer",fontSize:10,fontWeight:700,color:on?wc.c:B.steel,transition:"all 0.15s",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:2}}>
                      <span>{star}</span>
                      {isPortrait ? null : <span className="editor-btn-label"> {wv===1 ? "Требование" : "Преимущество"}</span>}
                    </button>;
                  })}
                  {sec.items.length>1&&<button type="button" className="btn-icon-close" onClick={()=>rmItem(si,ii)} style={{background:"none",border:"none",color:B.steel,cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0}}>×</button>}
                </div>
              </div>
            )}
            <button type="button" className="btn-secondary" onClick={()=>addItem(si)} style={{width:"100%",padding:"8px",border:"none",borderTop:`1px solid #F1F5F9`,background:"none",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:"0 0 12px 12px",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>+ Добавить параметр</button>
          </div>
        </div>
      )}
      <div style={{textAlign:"center",padding:20}}>
        <button className="btn-primary" onClick={()=>setView("input")} style={{padding:"10px 32px",borderRadius:20,border:"none",background:`linear-gradient(90deg,${B.blue},${B.neon})`,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${B.blue}44`}}>Перейти к оценке →</button>
      </div>
    </div>}

    {/* ═══ INPUT ═══ */}
    {view==="techspecs"&&<div className="view-section-pad" style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8,paddingBottom:12,borderBottom:`1px solid ${B.border}`}}>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:16,fontWeight:700,color:B.graphite}}>Технические условия (Стандарт качества)</div>
          <div style={{fontSize:12,color:B.steel,marginTop:2}}>Критерии подбора оборудования — только для справки, не влияет на расчёты</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {techSpecsEditMode ? (
            <>
              <button className="btn-secondary" onClick={()=>{setTechSpecs(techSpecsSnapshot.current);setTechSpecsEditMode(false);}} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
                Отменить
              </button>
              <button className="btn-secondary" onClick={()=>setShowApplyConfirm(true)} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.blue}`,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Применить
              </button>
              <button className="btn-secondary" onClick={exportTechSpecs} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Сохранить
              </button>
              <button className="btn-secondary" onClick={importTechSpecs} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Загрузить
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={()=>{techSpecsSnapshot.current=JSON.parse(JSON.stringify(techSpecs));setTechSpecsEditMode(true);}} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Редактировать
            </button>
          )}
        </div>
      </div>
      {!techSpecsEditMode && (
      <div style={{display:"flex",gap:6,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        {EQ_TYPES.map(t=>
          <button key={t} onClick={()=>switchEqType(t)} style={{padding:"6px 16px",borderRadius:12,border:`1.5px solid ${eqType===t?B.blue:B.border}`,background:eqType===t?"#EFF6FF":"#fff",color:eqType===t?B.blue:B.steel,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {t==="стойка"?"Стойка":"PDU"}
          </button>
        )}
      </div>
      )}
      {techSpecsEditMode&&<div style={{display:"flex",justifyContent:"flex-start",marginBottom:12}}>
        <button className="btn-add-vendor" onClick={()=>setTechSpecs(p=>[...p,{n:"Новый раздел",items:[{n:"Новый параметр",n2:""}]}])} style={{padding:"6px 14px",borderRadius:12,border:"1.5px dashed #CBD5E1",background:"#F8FAFC",color:"#7B97B2",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>+ Раздел</button>
      </div>}
      {techSpecs.map((sec,si)=>
        <div key={si} style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",borderLeft:`3px solid ${VC[si%VC.length]}`}}>
            {techSpecsEditMode&&(
              <div style={{display:"flex",gap:3,marginRight:4,flexShrink:0}}>
                <button type="button" className="btn-icon" onClick={()=>moveTechSection(si,-1)} disabled={si===0} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:si===0?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:si===0?0.3:1,padding:0}}>↑</button>
                <button type="button" className="btn-icon" onClick={()=>moveTechSection(si,1)} disabled={si===techSpecs.length-1} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:si===techSpecs.length-1?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:si===techSpecs.length-1?0.3:1,padding:0}}>↓</button>
              </div>
            )}
            <input readOnly={!techSpecsEditMode} value={sec.n} onChange={e=>setTechSpecs(p=>p.map((s,i)=>i===si?{...s,n:e.target.value}:s))} style={{flex:1,background:"transparent",border:"none",color:"#fff",fontSize:13,fontWeight:700,outline:"none",minWidth:0,pointerEvents:techSpecsEditMode?"auto":"none"}}/>
            {techSpecsEditMode&&techSpecs.length>1&&<button type="button" className="btn-icon-close" onClick={()=>setTechSpecs(p=>p.filter((_,i)=>i!==si))} style={{background:"none",border:"none",color:"#ffffff88",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>×</button>}
          </div>
          <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
            <div style={{display:"flex",padding:"6px 16px",background:"#F8FAFC",borderBottom:`1px solid ${B.border}`}}>
              <div style={{flex:"0 0 40%",fontSize:10,fontWeight:700,color:B.steel,textTransform:"uppercase",letterSpacing:"0.5px"}}>Параметр</div>
              <div style={{flex:"1 1 60%",fontSize:10,fontWeight:700,color:B.steel,textTransform:"uppercase",letterSpacing:"0.5px",paddingLeft:16}}>Требование</div>
            </div>
            {sec.items.map((it,ii)=>
              <div key={ii} className="ts-item-row" style={{display:"flex",alignItems:"stretch",gap:8,padding:"0 16px",minHeight:40,borderTop:ii?`1px solid #F1F5F9`:"none"}}>
                <div className="ts-param-col" style={{position:"relative",flex:"0 0 40%",display:"flex",alignItems:"flex-start",padding:"8px 0",borderRight:`1px solid ${B.border}`,paddingRight:12}}>
                  {techSpecsEditMode&&(
                    <div style={{display:"flex",gap:3,marginRight:4,flexShrink:0,alignSelf:"flex-start",marginTop:3}}>
                      <button type="button" className="btn-icon" onClick={()=>moveTechItem(si,ii,-1)} disabled={ii===0} style={{width:20,height:20,borderRadius:3,border:"0.5px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:ii===0?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:ii===0?0.3:1,padding:0}}>↑</button>
                      <button type="button" className="btn-icon" onClick={()=>moveTechItem(si,ii,1)} disabled={ii===sec.items.length-1} style={{width:20,height:20,borderRadius:3,border:"0.5px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:ii===sec.items.length-1?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:ii===sec.items.length-1?0.3:1,padding:0}}>↓</button>
                    </div>
                  )}
                  <AutoSizeTextarea
                    readOnly={!techSpecsEditMode}
                    value={it.n}
                    onChange={e=>{const v=e.target.value;setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:s.items.map((x,j)=>j===ii?{...x,n:v}:x)}:s));}}
                    minHeight={20}
                    placeholder="Параметр"
                    style={{flex:1,border:"none",background:"none",fontSize:12,color:B.graphite,outline:"none",resize:"none",fontFamily:"Inter, system-ui, sans-serif",lineHeight:"1.4",padding:0,minWidth:0}}
                  />
                </div>
                <div className="ts-req-col" style={{flex:"1 1 60%",display:"flex",alignItems:"center",padding:"8px 0",paddingLeft:12,background:"transparent"}}>
                  <AutoSizeTextarea
                    readOnly={!techSpecsEditMode}
                    value={it.n2||""}
                    onChange={e=>{const v=e.target.value;setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:s.items.map((x,j)=>j===ii?{...x,n2:v}:x)}:s));}}
                    minHeight={36}
                    placeholder="Требование"
                    style={{flex:1,border:"none",background:"#EFF6FF",borderRadius:6,padding:"6px 10px",fontSize:12,color:B.steel,outline:"none",resize:"none",fontFamily:"Inter, system-ui, sans-serif",lineHeight:"1.4",minWidth:0}}
                  />
                </div>
                {techSpecsEditMode&&sec.items.length>1&&<button type="button" className="btn-icon-close ts-item-delete" onClick={()=>setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:s.items.filter((_,j)=>j!==ii)}:s))} style={{background:"none",border:"none",color:B.steel,cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",alignSelf:"center"}}>×</button>}
              </div>
            )}
            {techSpecsEditMode&&<button type="button" className="btn-secondary" onClick={()=>setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:[...s.items,{n:"",n2:""}]}:s))} style={{width:"100%",padding:"8px",border:"none",borderTop:`1px solid #F1F5F9`,background:"none",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:"0 0 12px 12px",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>+ Добавить условие</button>}
          </div>
        </div>
      )}
    </div>}

        {view==="input"&&<div className="view-section-pad" style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
        <div style={{display:"inline-flex",gap:6,padding:"8px 16px",background:"#fff",borderRadius:12,border:`1px solid ${B.border}`,alignItems:"center",flexWrap:"wrap",justifyContent:"center"}}>
          <IconNo c="#EF4444" s={13}/><span style={{fontSize:11,color:"#EF4444",fontWeight:600}}>Нет</span>
          <span style={{color:B.border,margin:"0 4px"}}>│</span>
          <IconMid c="#F59E0B" s={13}/><span style={{fontSize:11,color:"#F59E0B",fontWeight:600}}>Частично</span>
          <span style={{color:B.border,margin:"0 4px"}}>│</span>
          <IconYes c="#10B981" s={13}/><span style={{fontSize:11,color:"#10B981",fontWeight:600}}>Да</span>
          <span style={{color:B.border,margin:"0 8px 0 4px"}}>│</span>
          <span style={{fontSize:10,color:B.steel}}>★ требование</span>
          <span style={{fontSize:10,color:B.steel,marginLeft:4}}>★! критичное</span>
          <span style={{fontSize:10,color:B.steel,marginLeft:4}}>☆ преимущество</span>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
        {vendors.length<25&&<button className="btn-add-vendor" onClick={addV} style={{padding:"6px 14px",borderRadius:12,border:"2px dashed #CBD5E1",background:"none",color:B.steel,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>{isPortrait ? '+' : '+ Добавить вендора'}</button>}
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button className="btn-action" onClick={()=>exportVendorPDF(act)} style={{padding:"6px 14px",borderRadius:12,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/><path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2"/></svg>
            Отчёт
          </button>
          <button className="btn-action" onClick={importFile} style={{padding:"6px 14px",borderRadius:12,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Загрузить
          </button>
          <button className="btn-danger" onClick={()=>setShowReset(true)} style={{padding:"6px 14px",borderRadius:12,border:`1.5px solid #EF4444`,background:"#fff",color:"#EF4444",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",transition:"all 0.2s ease"}}>Сбросить</button>
        </div>
      </div>
      <div className="vendor-tabs-wrap" style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {vendors.map((v,i)=>{return <div key={i} data-vendor-tab-pill="" onClick={()=>setAct(i)} style={{display:"inline-flex",alignItems:"center",borderRadius:12,cursor:"pointer",background:i===act?VC[i%VC.length]+"10":"#fff",border:`2px solid ${i===act?VC[i%VC.length]:B.border}`,transition:"all 0.2s",maxWidth:260,minWidth:"auto",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 8px 6px 12px",minWidth:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:VC[i%VC.length],flexShrink:0}}/><input value={v.name} onChange={e=>setName(i,e.target.value)} onClick={e=>e.stopPropagation()} style={{background:"none",border:"none",color:B.graphite,fontSize:12,fontWeight:i===act?700:400,width:Math.min(Math.max(v.name.length*7.5,60),140),minWidth:"9ch",maxWidth:140,outline:"none",overflow:"hidden",textOverflow:"ellipsis"}} title={v.name}/><span style={{fontSize:9,color:B.steel,flexShrink:0,whiteSpace:"nowrap"}}>{filled(v.scores)}/{itemCount}</span>
          </div>
          {vendors.length>1&&<span className="vendor-rm" onClick={e=>{e.stopPropagation();rmV(i);}} style={{borderLeft:`1px solid rgba(0,0,0,0.12)`,padding:"0 9px",cursor:"pointer",color:B.steel,fontSize:14,flexShrink:0,display:"flex",alignItems:"center",alignSelf:"stretch",transition:"all 0.15s ease"}}>×</span>}
        </div>;})}
      </div>
      {sections.map((sec,si)=>{const off=SEC_OFF[si];
        return <div key={si} style={{marginBottom:12}}>
          <div style={{padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",fontSize:12,fontWeight:700,color:"#fff",borderLeft:`3px solid ${VC[si%VC.length]}`}}>{sec.n}</div>
          <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
            {sec.items.map((it,ii)=>{const idx=off+ii;const v=vendors[act]?.scores[idx];const nt=vendors[act]?.notes[idx]||"";const imgs=vendors[act]?.images?.[idx]||null;const hasImgs=imgs&&imgs.length>0;const isExp=noteOpen===idx||noteOpen===-999;const isReq=it.w>=1;const hasNote=nt&&nt.trim()!==""&&nt.trim()!=="<br>"&&nt.trim()!=="<div><br></div>";const techReq=getTechReq(sec.n,it.n);
              return <div key={ii} style={{borderTop:ii?`1px solid #F1F5F9`:"none"}}>
                <div style={{display:"flex",alignItems:"center",padding:"8px 16px",gap:10,flexWrap:"wrap"}}>
                  <div style={{flex:"1 1 150px",minWidth:0}}>
                    <div className="input-item-name" style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                      <span style={{fontSize:12,color:B.graphite,whiteSpace:"normal",wordBreak:"break-word",lineHeight:"1.4",textAlign:"left",minWidth:0}}>{it.n}</span>
                      <span style={wbBadge(it.w)}>{it.w===2?"★!":it.w===1?"★":"☆"}</span>
                      {techReq&&<div style={{position:"relative",display:"inline-flex"}}>
                        {infoPopup===idx&&(
                          <div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",zIndex:300,background:"#334155",color:"#fff",fontSize:11,fontWeight:500,padding:"8px 12px",borderRadius:8,width:240,lineHeight:"1.5",boxShadow:"0 4px 16px rgba(0,0,0,0.22)",pointerEvents:"none",whiteSpace:"pre-wrap",wordBreak:"break-word",textAlign:"left"}}>
                            <div style={{fontWeight:700,marginBottom:4,fontSize:12}}>{it.n}</div>
                            {techReq}
                            <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:"5px solid #334155"}}/>
                          </div>
                        )}
                        <button type="button" onClick={e=>{e.stopPropagation();setInfoPopup(infoPopup===idx?null:idx);}} style={{background:"none",border:"none",padding:"0 2px",cursor:"pointer",color:B.steel,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,lineHeight:1}} title="Тех. условие">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                            <line x1="8" y1="7" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                            <circle cx="8" cy="4.8" r="0.9" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>}
                    </div>
                  </div>
                  <div className="input-item-btns" style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
                    {isReq?
                      [0,1,2].map(n2=>{const Ic=ICO[n2];const on=v===n2;return <button className="btn-score" key={n2} onClick={()=>setScore(idx,n2)} style={{width:38,height:38,borderRadius:10,border:on?`2px solid ${SM[n2].c}`:`1.5px solid ${B.border}`,background:on?SM[n2].bg:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",boxShadow:on?`0 2px 8px ${SM[n2].c}22`:"none"}}><Ic c={on?SM[n2].c:"#B0BEC5"} s={16}/></button>;})
                      :
                      [{sc:0,Ic:IconNo,sm:SM[0]},{sc:2,Ic:IconYes,sm:SM[2]}].map(({sc:sv,Ic,sm})=>{const on=v===sv;return <button className="btn-score" key={sv} onClick={()=>setScore(idx,sv)} style={{width:38,height:38,borderRadius:10,border:on?`2px solid ${sm.c}`:`1.5px solid ${B.border}`,background:on?sm.bg:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",boxShadow:on?`0 2px 8px ${sm.c}22`:"none"}}><Ic c={on?sm.c:"#B0BEC5"} s={16}/></button>;})
                    }
                    <button className="btn-score" onClick={()=>setNoteOpen(isExp&&noteOpen!==-999?null:idx)} style={{width:32,height:32,borderRadius:8,border:`1.5px solid ${(isExp||hasNote||hasImgs)?B.blue:B.border}`,background:(isExp||hasNote||hasImgs)?B.blue+"10":"#fff",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",color:(isExp||hasNote||hasImgs)?B.blue:B.steel,marginLeft:4,flexShrink:0}} title="Примечание">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                {isExp&&<div style={{padding:"0 16px 10px"}}>
                  <RichNote value={nt} onChange={html=>setNote(idx,html)}/>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6,flexWrap:"wrap"}}>
                    {hasImgs&&imgs.map((im,imIdx)=>{
                      const key=`${idx}-${imIdx}`;
                      const open=expImgs[key];
                      const isImg=!!im.isImg,isVid=!!im.isVid;
                      const isMedia=isImg||isVid;
                      return <div key={imIdx} style={{display:"inline-flex",alignItems:"center",borderRadius:8,border:`1.5px solid ${open&&isMedia?B.blue:B.border}`,background:open&&isMedia?B.blue+"08":"#fff",overflow:"hidden",transition:"all 0.15s"}}>
                        {isMedia
                          ? <button className="btn-icon" onClick={()=>setExpImgs(p=>({...p,[key]:!p[key]}))} style={{padding:"4px 8px",background:"none",border:"none",cursor:"pointer",fontSize:11,color:open?B.blue:B.steel,fontWeight:600,display:"flex",alignItems:"center",gap:4,maxWidth:160,overflow:"hidden"}}>
                              {isVid
                                ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><rect x="1" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M11 6l4-2v8l-4-2V6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="5.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 12l3.5-4 2.5 2.5L11 6l4 6" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                              }
                              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{im.name}</span>
                            </button>
                          : <span style={{padding:"4px 8px",fontSize:11,color:B.steel,fontWeight:600,display:"flex",alignItems:"center",gap:4,maxWidth:180,overflow:"hidden"}}>
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><path d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/><path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2"/></svg>
                              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{im.name}</span>
                            </span>
                        }
                        <a href={im.data} download={im.name} title="Скачать" style={{padding:"4px 6px",background:"none",border:"none",borderLeft:`1px solid ${B.border}`,cursor:"pointer",color:B.blue,display:"flex",alignItems:"center",textDecoration:"none"}}>
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 8l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        </a>
                        <button className="btn-icon-rm" onClick={()=>{rmImage(idx,imIdx);setExpImgs(p=>{const n={...p};delete n[key];return n;});}} style={{padding:"4px 6px",background:"none",border:"none",borderLeft:`1px solid ${B.border}`,cursor:"pointer",color:"#EF4444",fontSize:13,lineHeight:1,display:"flex",alignItems:"center"}} title="Удалить">×</button>
                      </div>;
                    })}
                    <label className="btn-file-upload" style={{padding:"4px 10px",borderRadius:8,border:`1.5px dashed ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      Файл
                      <input type="file" multiple style={{display:"none"}} onChange={e=>{
                        Array.from(e.target.files).forEach(f=>{
                          const mime=f.type||"";
                          const name=f.name||"";
                          const ext=name.split(".").pop().toLowerCase();
                          const isHeic=ext==="heic"||ext==="heif";
                          const isVid=mime.startsWith("video/");
                          const isImg=mime.startsWith("image/")||isHeic;
                          const reader=new FileReader();
                          if(isHeic){
                            /* Try native browser HEIC support via canvas (works in Safari).
                               On unsupported browsers, store as downloadable file. */
                            const blobUrl=URL.createObjectURL(f);
                            const img=new Image();
                            img.onload=()=>{
                              try{
                                const c=document.createElement("canvas");
                                c.width=img.naturalWidth;c.height=img.naturalHeight;
                                c.getContext("2d").drawImage(img,0,0);
                                const jpeg=c.toDataURL("image/jpeg",0.9);
                                URL.revokeObjectURL(blobUrl);
                                addImage(idx,name.replace(/\.(heic|heif)$/i,".jpg"),jpeg,false,true,false);
                              }catch{
                                URL.revokeObjectURL(blobUrl);
                                const fr=new FileReader();
                                fr.onload=ev2=>addImage(idx,name,ev2.target.result,false,false,false);
                                fr.readAsDataURL(f);
                              }
                            };
                            img.onerror=()=>{
                              /* Browser doesn't support HEIC — save as downloadable file */
                              URL.revokeObjectURL(blobUrl);
                              const fr=new FileReader();
                              fr.onload=ev2=>addImage(idx,name,ev2.target.result,false,false,false);
                              fr.readAsDataURL(f);
                            };
                            img.src=blobUrl;
                          }else if(isVid){
                            reader.onload=ev=>addImage(idx,name,ev.target.result,false,false,true);
                            reader.readAsDataURL(f);
                          }else if(isImg){
                            reader.onload=ev=>addImage(idx,name,ev.target.result,false,true,false);
                            reader.readAsDataURL(f);
                          }else{
                            reader.onload=ev=>addImage(idx,name,ev.target.result,false,false,false);
                            reader.readAsDataURL(f);
                          }
                        });
                        e.target.value="";
                      }}/>
                    </label>
                  </div>
                  {hasImgs&&imgs.map((im,imIdx)=>{const key=`${idx}-${imIdx}`;
                    if(!expImgs[key])return null;
                    if(im.isVid)return <div key={imIdx} style={{marginTop:6}}><video src={im.data} controls style={{maxWidth:"100%",maxHeight:300,borderRadius:8,border:`1px solid ${B.border}`,display:"block"}}/></div>;
                    if(im.isImg)return <div key={imIdx} style={{marginTop:6}}><img src={im.data} alt={im.name} style={{maxWidth:"100%",maxHeight:300,borderRadius:8,border:`1px solid ${B.border}`,objectFit:"contain",display:"block"}}/></div>;
                    return null;
                  })}
                </div>}
              </div>;
            })}
          </div>
        </div>;
      })}
      <div style={{display:"flex",justifyContent:"center",gap:12,padding:20}}>
        <button className="btn-primary" onClick={()=>setView("dashboard")} style={{padding:"10px 32px",borderRadius:20,border:"none",background:`linear-gradient(90deg,${B.blue},${B.neon})`,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${B.blue}44`}}>Дашборд →</button>
      </div>
    </div>}

    {/* DASHBOARD */}
    {view==="dashboard"&&<div data-dash="" style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px"}}>
      {/* Gauges */}
      <div data-gauges="" style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:12,marginBottom:24}}>
        {sortedIdx.map(i=><Gauge key={i} value={totals[i]} color={VC[i%VC.length]} label={vendors[i].name} rank={ranks[i]} fail={fails[i]}/>)}
      </div>

      {/* Heatmap — full width */}
      <div data-heatmap="" style={{background:"#F5F8FB",borderRadius:16,padding:16,marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:13,fontWeight:700,color:B.graphite}}>Сравнение по разделам</div>
          <div style={{height:28,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
            {heatmapSort.col===null
              ?<span data-no-print="" style={{fontSize:11,color:B.steel}}>← нажмите на номер для сортировки</span>
              :<span onClick={()=>setHeatmapSort({col:null,label:null})} style={{fontSize:11,fontWeight:700,color:B.blue,background:"#EFF6FF",padding:"4px 14px",borderRadius:20,border:"1px solid #BFDBFE",cursor:"pointer"}}>{heatmapSort.label}</span>}
          </div>
        </div>
        <div data-heatmap-legend="" style={{display:"none",marginBottom:10,fontSize:9,color:B.graphite,columnCount:2,columnGap:16}}>
          {sections.map((s,si)=><div key={si} style={{marginBottom:3}}><span style={{fontWeight:700,color:B.blue}}>{si+1}.</span> {s.n}</div>)}
        </div>
        <div className="heatmap-table-wrap">
        <div style={{borderRadius:12,overflow:"visible",border:"1px solid #E5EAF0",background:"#fff"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,tableLayout:"fixed"}}>
          <thead>
            <tr>
              <th style={{textAlign:"center",padding:"6px 8px",fontSize:10,color:B.steel,fontWeight:600,width:120}}>Вендор</th>
              {sections.map((s,si)=>{
                const active=heatmapSort.col===si;
                return <HeatmapTh key={si} si={si} s={s} active={active} onSort={()=>{const next=active?null:si;setHeatmapSort({col:next,label:next===null?null:s.n});}}/>;
              })}
              <th onClick={()=>setHeatmapSort({col:null,label:null})} style={{textAlign:"center",padding:"6px 4px",fontSize:10,fontWeight:heatmapSort.col===null?800:700,color:heatmapSort.col===null?B.blue:B.graphite,width:50,cursor:"pointer",userSelect:"none",transition:"color 0.15s"}}>Итого</th>
            </tr>
          </thead>
          <tbody>
            {heatmapSortedIdx.map((i,rank)=>{const v=vendors[i];const t=totals[i];const isLastRow=rank===heatmapSortedIdx.length-1;
              const rowBg="#fff";
              return <tr key={i} onClick={() => setHeatmapSelectedVendor(prev => prev === i ? null : i)} style={{borderBottom:isLastRow?"none":`1px solid #F1F5F9`,cursor:"pointer",opacity:heatmapSelectedVendor !== null && heatmapSelectedVendor !== i ? 0.4 : 1,transition:"opacity 0.2s"}}>
                <td title={v.name} style={{padding:"6px 8px",fontSize:10,fontWeight:600,color:VC[i%VC.length],textAlign:"center",background:`linear-gradient(to right, ${VC[i%VC.length]} 0 3px, ${rowBg} 3px)`,borderRight:`1px solid ${B.border}`,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",borderRadius:isLastRow?"0 0 0 12px":undefined,backgroundClip:"padding-box"}}>{v.name}</td>
                {sections.map((s,si)=>{
                  const val=allSec[i]?allSec[i][si]:0;
                  const bg=val>=8?"#D1FAE5":val>=5?"#FEF3C7":val>0?"#FEE2E2":"#F1F5F9";
                  const tc=val>=8?"#065F46":val>=5?"#92400E":val>0?"#991B1B":"#CBD5E1";
                  const isActiveCol=heatmapSort.col===si;
                  return <td key={si} style={{textAlign:"center",padding:"6px 2px",background:bg,fontWeight:isActiveCol?800:700,fontSize:10,color:tc,outline:isActiveCol?`1.5px solid ${B.blue}40`:undefined,outlineOffset:-1}}>{val===0?"—":fmt(val)}</td>;
                })}
                <td style={{textAlign:"center",padding:"6px 4px",fontWeight:800,fontSize:11,color:t!=null&&t>=8?"#065F46":t!=null&&t>=5?"#92400E":t!=null&&t>0?"#991B1B":B.steel,background:t!=null&&t>=8?"#D1FAE5":t!=null&&t>=5?"#FEF3C7":t!=null&&t>0?"#FEE2E2":rowBg,borderLeft:`2px solid ${B.border}`,borderRadius:isLastRow?"0 0 12px 0":undefined,clipPath:isLastRow?"inset(0 round 0 0 12px 0)":undefined}}>{fmt(t)}</td>
              </tr>;
            })}
          </tbody>
        </table>
        </div>
        </div>
      </div>

      {/* Vendor bars */}
      <div style={{display:"flex",flexWrap:"wrap",gap:16,marginBottom:24}}>
        <div data-bars-wrap="" style={{flex:"1 1 100%",display:"flex",flexWrap:"wrap",gap:10}}>
          {sortedIdx.map(i=>{const v=vendors[i];
            return <div data-vendor-bars="" key={i} style={{flex:"1 1 calc(50% - 8px)",maxWidth:"calc(50% - 8px)",minWidth:0,background:"#fff",borderRadius:16,padding:12,border:`1px solid ${B.border}`,overflow:"hidden"}}>
            <div style={{fontSize:12,fontWeight:700,color:VC[i%VC.length],marginBottom:6}}>{v.name} — {fmt(totals[i])}/10</div>
            {sections.map((s,si)=>{
              const val=allSec[i]?allSec[i][si]:0;
              const valBg=val>=8?"#D1FAE5":val>=5?"#FEF3C7":val>0?"#FEE2E2":"#F1F5F9";
              const valC=val>=8?"#065F46":val>=5?"#92400E":val>0?"#991B1B":"#7B97B2";
              return <div key={si} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <div className="sec-bar-label" title={s.n}>{s.n}</div>
                <div style={{flex:1,minWidth:0}}><SegBar scores={v.scores} notes={v.notes} images={v.images} si={si} onNoteClick={setNotePopup} secs={sections} offs={SEC_OFF} sortByColor/></div>
                <div style={{width:36,height:20,borderRadius:6,fontSize:11,fontWeight:700,background:valBg,color:valC,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{fmt(val)}</div>
              </div>;
            })}
            <div className="vendor-legend-row" style={{display:"flex",gap:8,marginTop:6,marginLeft:0,paddingTop:6,paddingLeft:0,borderTop:"1px solid #F1F5F9",flexWrap:"wrap",justifyContent:"center"}}>
              <div className="vendor-legend-center" style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:"#10B981"}}><div style={{width:8,height:8,borderRadius:2,background:"#10B981"}}/>Да</div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:"#F59E0B"}}><div style={{width:8,height:8,borderRadius:2,background:"#F59E0B"}}/>Частично</div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:"#EF4444"}}><div style={{width:8,height:8,borderRadius:2,background:"#EF4444"}}/>Нет</div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:B.steel}}><div style={{width:8,height:8,borderRadius:2,background:"#E2E8F0"}}/>Нет оценки</div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:B.steel}}><div style={{width:6,height:6,borderRadius:"50%",background:"#fff",border:"1px solid #999"}}/>Примечание</div>
              </div>
            </div>
          </div>;})}
        </div>
      </div>

      {/* Top/bottom */}
      <div data-bottom-cards="" style={{display:"flex",flexWrap:"wrap",gap:12}}>
        {sortedIdx.filter(i=>getAdvantages(vendors[i].scores).length>0).map(i=>{const v=vendors[i];const advs=getAdvantages(v.scores);
          return <div key={i} style={{flex:"1 1 280px",minWidth:0,background:"#fff",borderRadius:16,padding:16,border:`1px solid ${B.border}`,borderTop:`3px solid ${VC[i%VC.length]}`}}>
            <div style={{fontSize:13,fontWeight:700,color:VC[i%VC.length],marginBottom:10,wordBreak:"break-word",textAlign:"left"}}>{v.name}</div>
            <div style={{fontSize:9,fontWeight:700,color:B.blue,textTransform:"uppercase",letterSpacing:1,marginBottom:6,textAlign:"left"}}>☆ Преимущества</div>
            {advs.map((a,j)=><div key={j} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",fontSize:11}}><IconYes c="#10B981" s={12} style={{flexShrink:0}}/><span style={{color:B.graphite,wordBreak:"break-word"}}>{a.n}</span></div>)}
          </div>;
        })}
      </div>
    </div>}

    {/* Footer */}
    <footer data-footer="" style={{padding:"12px 24px",borderTop:`1px solid ${B.border}`,background:"#fff",display:"flex",justifyContent:"center",alignItems:"center",gap:6,fontSize:11,color:B.steel,flexShrink:0}}>
      <span>Авторы:</span>
      <a href="https://t.me/anezuf" target="_blank" rel="noreferrer" style={{color:B.blue,fontWeight:600,textDecoration:"none"}}>Трандафил Кирилл Антонович</a>
      <span>·</span>
      <span style={{color:B.graphite,fontWeight:500}}>Грачев Егор Алексеевич</span>
    </footer>
  </div>;
}
