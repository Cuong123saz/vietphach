import type Phaser from 'phaser';
import { KHANG_CHIEN_REFUGE as R } from '../../world/khangChien';

export function preloadKhangChienRefuge(scene:Phaser.Scene):void {
  scene.load.image('khang-chien-villagers','/assets/maps/khang-chien/villagers-seated-house.png');
  scene.load.image('khang-chien-villagers-extra','/assets/maps/khang-chien/villagers-children-elders.png');
  scene.load.image('khang-chien-barrier','/assets/maps/khang-chien/water-barrier-v2.png');
}
export function drawKhangChienRefuge(scene:Phaser.Scene):Phaser.GameObjects.Image {
  const texture=scene.textures.get('khang-chien-villagers'),source=texture.getSourceImage();
  const extra=scene.textures.get('khang-chien-villagers-extra').getSourceImage();
  scene.add.image(R.villagers.x+12,R.villagers.y-32,'khang-chien-villagers-extra')
    .setOrigin(.5,1).setScale(160/extra.width).setTint(0xc4b7a4).setDepth(R.villagers.y-32);
  scene.add.image(R.villagers.x,R.villagers.y,'khang-chien-villagers')
    .setOrigin(.5,1).setScale(85/source.width).setTint(0xc4b7a4).setDepth(R.villagers.y);
  const barrier=scene.add.image(R.x,R.y+R.radiusY,'khang-chien-barrier').setOrigin(.5,1)
    .setDisplaySize(R.radiusX*2,R.radiusY*2+180).setAlpha(.85).setDepth(R.y+R.radiusY+1);
  scene.tweens.add({targets:barrier,alpha:.95,duration:3200,ease:'Sine.InOut',yoyo:true,repeat:-1});
  return barrier;
}
