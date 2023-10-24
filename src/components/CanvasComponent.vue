<template>
  <div
    v-loading.fullscreen.lock="showLoading"
    class="main-wrap"
    element-loading-text="Loading..."
    :element-loading-spinner="svg"
    element-loading-svg-view-box="-10, -10, 50, 50"
    element-loading-background="rgba(122, 122, 122, 0.8)"
  >
    <div class="left">
      <canvas id="canvas" ref="canvas" width="1200" height="1200"></canvas>
    </div>
    <div class="right">
      <div class="form-wrap">
        <div class="form-item">
          <span class="label">目标图片</span>
          <el-upload
            ref="upload"
            v-model:file-list="targetFile"
            class="upload"
            :on-exceed="handleExceed"
            :limit="1"
            :http-request="selectFile"
            :show-file-list="false"
          >
            <el-button type="primary" size="small">选择文件</el-button>
          </el-upload>
        </div>
        <div class="form-item">
          <span class="label">素材图片</span>
          <el-button size="small" type="primary" @click="inputFile">
            选择图片
          </el-button>
        </div>
        <span class="tips">共选择{{ imgList.length }}个文件</span>
      </div>
      <div class="operation-wrap">
        <el-button size="small" type="warning" @click="reload">重置</el-button>
        <el-button size="small" type="primary" @click="generateImg">
          生成图片
        </el-button>
        <el-button size="small" type="success" @click="exportCanvas">
          导出图片
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import { genFileId } from "element-plus";
import type {
  UploadInstance,
  UploadProps,
  UploadRawFile,
  UploadUserFile,
} from "element-plus";

import { fabric } from "fabric";

import { getAverageColor } from "../utils/averageColor";
import { getFiles } from "../utils/inputFile";
import { mostBlockColors } from "../utils/mostBlockColor";

let canvas: any;
let ctx: any;

const svg = `
  <path class="path" d="
    M 30 15
    L 28 17
    M 25.61 25.61
    A 15 15, 0, 0, 1, 15 30
    A 15 15, 0, 1, 1, 27.99 7.5
    L 15 15
  " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
`;
const blockList: Array<any> = []; //画布数据
const imgList: Array<any> = []; //素材图
const blockMainColors: Array<any> = []; //每个格子的主色调

const targetFile = ref<UploadUserFile[]>([]);

const showLoading = ref(false);

onMounted(() => {
  initCanvas();
});
const upload = ref<UploadInstance>();

const handleExceed: UploadProps["onExceed"] = (files) => {
  upload.value!.clearFiles();
  const file = files[0] as UploadRawFile;
  file.uid = genFileId();
  upload.value!.handleStart(file);
  reload();
  console.log("🚀🚀🚀 / file", file);
  const binaryData = [];
  binaryData.push(file);
  const tempUrl = window.URL.createObjectURL(new Blob(binaryData));
  drawImage(tempUrl);
};

const initCanvas = (): void => {
  canvas = new fabric.Canvas("canvas", {
    isDrawingMode: false, //自由绘画模式
    selectable: false,
    selection: false,
    hoverCursor: "pointer",
    devicePixelRatio: true, //Retina 高清屏 屏幕支持
    stroke: "lightgreen",
    strokeWidth: 4,
  });

  ctx = canvas.getContext("2d");
  canvas.freeDrawingBrush.color = "blue";
  canvas.freeDrawingBrush.width = 5;
  addCanvasEvent();
};

const selectFile = (file: any) => {
  console.log("🚀🚀🚀 / file", file);
  const binaryData = [];
  binaryData.push(file.file);
  const tempUrl = window.URL.createObjectURL(new Blob(binaryData));
  drawImage(tempUrl);
};

//素材图片选择回调
const inputFile = async () => {
  const files = await getFiles();
  showLoading.value = true;
  for (let i = 0; i < files.length; i++) {
    const image = await getAverageColor(files[i]);
    imgList.push(image);
  }
  console.log(imgList);
  showLoading.value = false;
};

//重置
const reload = () => {
  // window.location.reload();
  console.log(canvas);
  // this.canvas && this.canvas.deactivateAll().renderAll()
  //http://fabricjs.com/fabric-intro-part-5#pan_zoom
  canvas.clear(); // 清空画布
};

const generateImg = () => {
  showLoading.value = true;
  const diffColorList: Array<any> = [];
  //遍历所有方块
  for (let i = 0; i < blockMainColors.length; i++) {
    diffColorList[i] = { diffs: [] };
    //遍历所有图片
    for (let j = 0; j < imgList.length; j++) {
      diffColorList[i].diffs.push({
        url: imgList[j].url,
        diff: colorDiff(blockMainColors[i].color, imgList[j].color),
        color: imgList[j].color,
      });
    }
    //对比较过的图片进行排序,差异最小的放最前面
    diffColorList[i].diffs.sort((a: any, b: any) => {
      return a.diff - b.diff;
    });
    //取第0个图片信息
    diffColorList[i].url = diffColorList[i].diffs[0].url;
    diffColorList[i].position = blockMainColors[i].position;
    diffColorList[i].Acolor = blockMainColors[i].color;
    diffColorList[i].Bcolor = diffColorList[i].diffs[0].color;
  }
  showLoading.value = false;
  console.log(diffColorList);
  //遍历每一个方块,对其渲染
  diffColorList.forEach((item) => {
    fabric.Image.fromURL(item.url, (img: any) => {
      const scale = img.height > img.width ? 12 / img.width : 12 / img.height;
      // img.scale(8 / img.height);
      img.set({
        left: item.position[0] * 12,
        top: item.position[1] * 12,
        originX: "center",
        scaleX: scale,
        scaleY: scale,
      });
      canvas.add(img);
    });
  });
};
//导出图片
const exportCanvas = () => {
  const dataURL = canvas.toDataURL({
    width: canvas.width,
    height: canvas.height,
    left: 0,
    top: 0,
    format: "png",
  });
  const link = document.createElement("a");
  link.download = "canvas.png";
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const colorDiff = (color1: any, color2: any) => {
  let d = 0;
  for (let i = 0; i < color1.length; i++) {
    d += (color1[i] - color2[i]) ** 2;
  }
  return Math.sqrt(d);
};

const addCanvasEvent = () => {
  //画布重绘
  canvas.on("after:render", (e: any) => {});
  //有对象添加进来
  canvas.on("object:added", (e: any) => {});
  //鼠标单击
  canvas.on("mouse:down", (e: any) => {
    //ALT键盘+单击,获取当前光标处像素的值
    if (e.e.ctrlKey) {
      const mouse = canvas.getPointer(e.e);
      const x = parseInt(mouse.x);
      const y = parseInt(mouse.y);
      const px = ctx.getImageData(x, y, 1, 1).data;
      console.log(
        `%c x,y:(${x},${y})/rgba(${px[0]},${px[1]},${px[2]},${px[3]})`,
        `background: rgba(${px[0]},${px[1]},${px[2]},${px[3]});`
      );
    }
  });
  // 滚轮事件
  canvas.on("mouse:wheel", (e: any) => {
    e.e.preventDefault();
    e.e.stopPropagation();
    const ZOOM = 0.05;
    let point = new fabric.Point(canvas.width / 2 - 1, canvas.height / 2 - 1);
    //(alt + whell 缩放)
    if (!e.e.ctrlKey) {
      return;
    } else if (e.e.altKey && e.e.ctrlKey) {
      point = new fabric.Point(e.pointer.x, e.pointer.y);
    }
    let zoom = (e.e.deltaY > 0 ? -ZOOM : ZOOM) + canvas.getZoom();
    zoom = Math.max(0.1, zoom); //最小为原来的0.1倍
    zoom = Math.min(10, zoom); //最大是原来的10倍
    canvas.zoomToPoint(point, zoom);
  });
  //画布随着鼠标移动。
  let panning: boolean;
  canvas.on({
    "mouse:down": (e: any) => {
      if (e.e.altKey) {
        panning = true;
        canvas.selection = false;
      }
    },
    "mouse:up": (e: any) => {
      panning = false;
      canvas.selection = true;
    },
    "mouse:move": (e: any) => {
      if (panning && e && e.e) {
        const delta = new fabric.Point(e.e.movementX, e.e.movementY);
        canvas.relativePan(delta);
      }
    },
  });
  canvas.on({
    //对象被移动时,添加透明效果
    "object:moving": function (e: any) {
      console.log(e);
      e.target.opacity = 0.5;
    },
    //对象被改变后
    "object:modified": function (e: any) {
      e.target.opacity = 1;
    },
  });
};

const drawImage = (url: string) => {
  showLoading.value = true;
  fabric.Image.fromURL(url, (img: any) => {
    //设置缩放比例,长图的缩放比为this.canvas.width / img.width,宽图的缩放比为this.canvas.height / img.height
    const scale =
      img.height > img.width
        ? canvas.width / img.width
        : canvas.height / img.height;
    img.set({
      left: canvas.width / 2, //距离左边的距离
      originX: "center", //图片在原点的对齐方式
      originY: "center",
      top: canvas.height / 2,
      scaleX: scale, //横向缩放
      scaleY: scale, //纵向缩放
      selectable: false, //可交互
    });
    img.on("added", (e: any) => {
      //这里有个问题,added后获取的是之前的画布像素数据,其他手动触发的事件,不会有这种问题
      //故用一个异步解决
      setTimeout(() => {
        getCanvasData();
      }, 500);
    });
    console.log(canvas);

    canvas.add(img); //将图片添加到画布
  });
};
const mostBlockColor = (blockList: Array<any>) => {
  //所有颜色的平均值为主色调
  for (let i = 0; i < blockList.length; i++) {
    let r = 0,
      g = 0,
      b = 0,
      a = 0;
    for (let j = 0; j < blockList[i].color[j].length; j++) {
      r += blockList[i].color[j][0];
      g += blockList[i].color[j][1];
      b += blockList[i].color[j][2];
      a += blockList[i].color[j][3];
    }
    // 求取平均值
    r /= blockList[i].color[0].length;
    g /= blockList[i].color[0].length;
    b /= blockList[i].color[0].length;
    a /= blockList[i].color[0].length;
    // 将最终的值取整
    r = Math.round(r);
    g = Math.round(g);
    b = Math.round(b);
    a = Math.round(a);
    blockMainColors.push({
      position: blockList[i].position,
      color: [r, g, b, a],
    });
  }
};
const getCanvasData = () => {
  for (let Y = 0; Y < canvas.height / 12; Y++) {
    for (let X = 0; X < canvas.width / 12; X++) {
      //每8*8像素的一块区域一组
      const tempColorData = ctx.getImageData(X * 12, Y * 12, 12, 12).data;
      // console.log(X, Y, tempColorData);
      //将获取到数据每4个一组,每组都是一个像素
      blockList[Y * 100 + X] = { position: [X, Y], color: [] };
      for (let i = 0; i < tempColorData.length; i += 4) {
        blockList[Y * 100 + X].color.push([
          tempColorData[i],
          tempColorData[i + 1],
          tempColorData[i + 2],
          tempColorData[i + 3],
        ]);
      }
    }
  }
  console.log(mostBlockColors(blockList));
  mostBlockColor(blockList);
  showLoading.value = false;
};
</script>

<style lang="scss" scoped>
.main-wrap {
  display: flex;
  justify-content: flex-start;
  width: 1800px;
  height: 1400px;

  .left {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 75%;
    height: 100%;
    background-color: #91a8d0;

    #canvas {
      border: 1px dashed #5170a3;
      background: rgba(255, 255, 255, 1);
    }
  }

  .right {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 25%;
    height: 100%;
    background-color: #5170a3;

    .form-wrap {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      margin-top: 20px;

      .form-item {
        display: flex;
        justify-content: space-between;
        width: 180px;
        height: 30px;
        line-height: 30px;
        margin-top: 30px;

        .label {
          color: #fff;
        }

        .upload {
          width: 80px;
        }
      }

      .tips {
        margin: 10px 0 0 100px;
        font-size: 10px;
        color: #fff;
      }
    }

    .operation-wrap {
      display: flex;
      justify-content: space-around;
      margin-bottom: 100px;
    }
  }
}
</style>
