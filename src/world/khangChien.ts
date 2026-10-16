import { MAPS, type Stage, type Zone, type Point } from './definitions';

export const KHANG_CHIEN_REFUGE = { x:1630, y:230, radiusX:560, radiusY:330,
  villagers:{x:1745,y:345} } as const;
/** Road centerlines in 2200×1400 world coordinates, shared by the four painted maps. */
export const KHANG_CHIEN_ROADS:readonly {id:string;name:string;points:readonly Point[]}[]=[
  {id:'west',name:'Đường cầu phía Tây',points:[{x:340,y:660},{x:570,y:730},{x:870,y:780},{x:1100,y:680},{x:1280,y:650}]},
  {id:'south',name:'Đường phía Nam',points:[{x:430,y:1120},{x:600,y:1020},{x:740,y:860},{x:1000,y:720},{x:1280,y:650}]},
  {id:'southeast',name:'Đường phía Đông Nam',points:[{x:1710,y:1140},{x:1540,y:1040},{x:1290,y:1020},{x:1080,y:970},{x:920,y:890},{x:830,y:810},{x:1000,y:720},{x:1280,y:650}]},
];
export function khangChienMapId(search:string):keyof typeof MAPS|undefined {
  const id=new URLSearchParams(search).get('map');
  return id && /^khang-chien-[1-4]$/.test(id)?id as keyof typeof MAPS:undefined;
}
export function createKhangChienZone(index:number):Zone {
  if(!Number.isInteger(index) || index<1 || index>4)throw new Error('Kháng Chiến requires Map 1–4.');
  const refuge=KHANG_CHIEN_REFUGE,mapId=`khang-chien-${index}` as keyof typeof MAPS;
  return {id:mapId,name:MAPS[mapId].name,type:'MONSTER',mapId,spawn:{x:1140,y:650},objects:[
    ...Array.from({length:24},(_,i)=>{
      const a=i*Math.PI*2/24,b=(i+1)*Math.PI*2/24;
      const point=(angle:number,inset:number)=>({x:Math.cos(angle)*(refuge.radiusX-inset),y:Math.sin(angle)*(refuge.radiusY-inset)});
      return {id:`${mapId}:barrier:${i}`,name:'Kết giới nước bảo vệ dân làng',kind:'obstacle' as const,resource:'water-barrier',
        x:refuge.x,y:refuge.y,shape:{type:'polygon' as const,points:[point(a,0),point(b,0),point(b,16),point(a,16)]}};
    }).filter(segment=>segment.shape.points.every(point=>segment.y+point.y>=0)),
    {id:`${mapId}:villagers`,name:'Dân làng trú ẩn',kind:'npc',resource:'villagers-seated',...refuge.villagers},
  ]};
}
export function createKhangChienStage():Stage {
  return {version:1,id:'khang-chien',name:'Kháng Chiến',zones:[1,2,3,4].map(createKhangChienZone)};
}
