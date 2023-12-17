// 获取DOM元素
const previewEle = document.querySelector(".preview");
const avatarEle = document.querySelector(".avatar");
const inputELe = document.querySelector('input[type="file"]');
const selectAngleEles = document.querySelectorAll(".select div");
const selectEle = document.querySelector(".select");
const imgArea = document.querySelector(".imgArea");
// 预览看内的canvas，用于实现明暗效果
const selectCVS = document.querySelector('.selectCVS')
const shadowBox = document.querySelector('.shadowBox')
// 绘图节流
// const throttle = (func, limit) => {
//   let inThrottle; // 节流阀
//   let timer = null;
//   return function () {
//     const context = this;
//     const args = arguments;

//     // 达到节流时间
//     if (!inThrottle) {
//       if (timer) clearTimeout(timer);
//       func.apply(context, args); // 执行回调
//       // 关闭节流阀
//       inThrottle = true;
//       // 开启定时器计时
//       timer = setTimeout(() => (inThrottle = false), limit);
//     }
//   };
// };
// // 节流后的裁剪函数
// const cropImg = throttle(cropImage, 50);

// 记录裁剪框的尺寸
let selectSize = {};
// 四个角拖拽时控制裁剪框不能拖拽
let isFourAngleDrag = false;
// shadowBox是否显示
let isShadowBoxShow = false
// 文件选择事件
inputELe.onchange = (e) => {
  const file = e.target.files[0];
  console.log("查看图片尺寸信息", e);

  const reader = new FileReader();
  reader.onload = (e) => {
    // 添加预览图
    previewEle.src = e.target.result;
    previewEle.style.backgroundColor = "#000";
    // 显示shadowBox
    shadowBox.style.display = 'block'
  };
  reader.readAsDataURL(file);
};

// imgArea区域数据
const imgAreaData = {
  left: imgArea.getBoundingClientRect().left,
  top: imgArea.getBoundingClientRect().top,
  width: imgArea.getBoundingClientRect().width,
  height: imgArea.getBoundingClientRect().height,
};

// 记录图像短边、宽高比、单侧间隙宽度的数据
let shortSide, WHRatio, gapWidth;
previewEle.onload = (e) => {
  selectEle.style.display = "block";
  console.log("图片加载成功", previewEle.getBoundingClientRect());
  // 获取图像显示区域的宽高
  const previewAreaWidth = previewEle.getBoundingClientRect().width;
  const previewAreaHeight = previewEle.getBoundingClientRect().height;
  // 获取图像原始大小
  const imgWidth = previewEle.naturalWidth;
  const imgHeight = previewEle.naturalHeight;
  // 得到宽高比
  WHRatio = imgWidth / imgHeight;
  if (WHRatio > 1) {
    // 短边是高
    shortSide = previewAreaWidth / WHRatio;
    gapWidth = (previewAreaHeight - shortSide) / 2;
  } else if (WHRatio < 1) {
    // 短边是宽
    shortSide = previewAreaHeight * WHRatio;
    gapWidth = (previewAreaWidth - shortSide) / 2;
  } else {
    shortSide = previewAreaWidth;
    gapWidth = 0;
  }
  console.log("shortSide", shortSide);
  monitorSelectSize();
  cropImage();
};

console.log("imgAreaData", imgAreaData);

// 监听拖拽区域数据变化
function monitorSelectSize() {
  // 注意canvas绘制时裁剪的坐标是相对于原图大小的
  let size = selectEle.getBoundingClientRect();
  // x方向预览图和原图大小比率
  let xRatio, yRatio;
  // 裁剪框左上角距视口的xy
  if (WHRatio < 1) {
    xRatio = previewEle.naturalWidth / shortSide;
    yRatio = previewEle.naturalHeight / imgAreaData.height;
    selectSize.x = (size.left - imgAreaData.left - gapWidth) * xRatio;
    selectSize.y = (size.top - imgAreaData.top) * yRatio;
  } else if (WHRatio > 1) {
    xRatio = previewEle.naturalWidth / imgAreaData.width;
    yRatio = previewEle.naturalHeight / shortSide;
    selectSize.x = (size.left - imgAreaData.left) * xRatio;
    selectSize.y = (size.top - imgAreaData.top - gapWidth) * yRatio;
  } else {
    xRatio = previewEle.naturalWidth / imgAreaData.width;
    yRatio = previewEle.naturalHeight / imgAreaData.height;
    selectSize.x = (size.left - imgAreaData.left) * xRatio;
    selectSize.y = (size.top - imgAreaData.top) * yRatio;
  }
  // 裁剪框大小
  selectSize.sWidth = size.width * xRatio;
  selectSize.sHeight = size.height * yRatio;

  // 同步修改预览框的canvas
  selectCVS.style.top = size.top
  selectCVS.style.left = size.left
  selectCVS.style.width = size.width
  selectCVS.style.height = size.height

  // 通过canvas绘制
  cropImage();
}

// 拖拽区域逻辑
(function () {
  let relativeX, relativeY;
  let dragAble = false;
  document.addEventListener("mouseup", removeDragSelectAreaFun);
  function removeDragSelectAreaFun() {
    dragAble = false;
    selectEle.removeEventListener("mousemove", dragSelectArea);
  }
  selectEle.onmousedown = (e) => {
    dragAble = true;
    relativeX = e.clientX - selectEle.getBoundingClientRect().left;
    relativeY = e.clientY - selectEle.getBoundingClientRect().top;
    selectEle.addEventListener("mousemove", dragSelectArea);
  };

  function dragSelectArea(e) {
    if (!dragAble) return;
    if (isFourAngleDrag) return;
    let left = e.clientX - imgAreaData.left - relativeX;
    let top = e.clientY - imgAreaData.top - relativeY;

    // 显示裁剪区域
    if (WHRatio < 1) {
      // 宽高比小于1
      if (left < gapWidth) left = gapWidth;
      if (
        left + selectEle.getBoundingClientRect().width + gapWidth >
        imgAreaData.width
      ) {
        left =
          imgAreaData.width -
          selectEle.getBoundingClientRect().width -
          gapWidth;
      }
      if (top < 0) top = 0;
      if (top + selectEle.getBoundingClientRect().height > imgAreaData.height) {
        top = imgAreaData.height - selectEle.getBoundingClientRect().height;
      }
    } else if (WHRatio > 1) {
      // 宽高比大于1
      if (left < 0) left = 0;
      if (left + selectEle.getBoundingClientRect().width > imgAreaData.width)
        left = imgAreaData.width - selectEle.getBoundingClientRect().width;
      if (top < gapWidth) top = gapWidth;
      if (top + selectEle.getBoundingClientRect().height > gapWidth + shortSide)
        top = gapWidth + shortSide - selectEle.getBoundingClientRect().height;
    } else {
      // 宽高比等于1
      if (left < 0) left = 0;
      if (left + selectEle.getBoundingClientRect().width > imgAreaData.width) {
        left = imgAreaData.width - selectEle.getBoundingClientRect().width;
      }
      if (top < 0) top = 0;
      if (top + selectEle.getBoundingClientRect().height > imgAreaData.height) {
        top = imgAreaData.height - selectEle.getBoundingClientRect().height;
      }
    }

    selectEle.style.left = left + "px";
    selectEle.style.top = top + "px";
    monitorSelectSize();
  }
})();

// 左上角拖拽逻辑
(function () {
  // opposite是左上角的对角(即右下角)的坐标
  let oppositeX, oppositeY;
  let dragAble = false;
  // 监听整个文档鼠标左键松开事件,注意不能用onmouseup注册，那样会被后面的覆盖
  document.addEventListener("mouseup", removeDragLTFun);
  function removeDragLTFun() {
    dragAble = false;
    isFourAngleDrag = false;
    imgArea.removeEventListener("mousemove", dragLT);
  }

  // 左上
  selectAngleEles[0].onmousedown = (e) => {
    dragAble = true;
    // 对角坐标
    oppositeX =
      selectEle.getBoundingClientRect().left +
      selectEle.getBoundingClientRect().width;
    oppositeY =
      selectEle.getBoundingClientRect().top +
      selectEle.getBoundingClientRect().height;

    imgArea.addEventListener("mousemove", dragLT);
  };
  // 左上角的监听事件
  function dragLT(e) {
    if (!dragAble) return;
    isFourAngleDrag = true;
    // 通过HTMLElement.style.top(left)属性设置值用于定位时是相对于父元素的
    let left = e.clientX - imgAreaData.left;
    let top = e.clientY - imgAreaData.top;

    // 限制拖拽框
    if (WHRatio < 1) {
      // 图像的宽高比小于1
      if (left < gapWidth) left = gapWidth;
      if (top < 0) top = 0;
    } else if (WHRatio > 1) {
      // 图像的宽高比大于1
      if (left < 0) left = 0;
      if (top < gapWidth) top = gapWidth;
    } else {
      // 图像的宽高比等于1
      if (left < 0) left = 0;
      if (top < 0) top = 0;
    }
    // 对角固定，计算宽高
    let width = oppositeX - left - imgAreaData.left;
    let height = oppositeY - top - imgAreaData.top;
    if (width < 5 || height < 5) return;
    selectEle.style.left = left + "px";
    selectEle.style.top = top + "px";
    selectEle.style.width = width + "px";
    selectEle.style.height = height + "px";
    monitorSelectSize();
  }
})();

// 右上拖拽逻辑
(function () {
  // opposite是右上角的对角(即左下角)的坐标
  let startX, startY, oppositeX, oppositeY;
  let dragAble = false;
  // 监听整个文档鼠标左键松开事件,注意不能用onmouseup注册，那样会被后面的覆盖
  document.addEventListener("mouseup", removeDragRTFun);
  function removeDragRTFun() {
    dragAble = false;
    isFourAngleDrag = false;
    imgArea.removeEventListener("mousemove", dragRT);
  }

  // 右上
  selectAngleEles[1].onmousedown = (e) => {
    dragAble = true;
    // 起始点右上角的坐标
    startX =
      selectEle.getBoundingClientRect().left +
      selectEle.getBoundingClientRect().width;
    startY = selectEle.getBoundingClientRect().top;
    // 对角坐标
    oppositeX = selectEle.getBoundingClientRect().left;
    oppositeY =
      selectEle.getBoundingClientRect().top +
      selectEle.getBoundingClientRect().height;

    imgArea.addEventListener("mousemove", dragRT);
    console.log("右起始点", startX, startY, oppositeX, oppositeY);
  };
  // 右上角的监听事件
  function dragRT(e) {
    if (!dragAble) return;
    isFourAngleDrag = true;
    // left固定
    let left = oppositeX - imgAreaData.left;
    let width = e.clientX - oppositeX;
    let height = oppositeY - e.clientY;
    // top变化
    let top = oppositeY - imgAreaData.top - height;

    // 限制拖拽框
    if (WHRatio < 1) {
      // 用于修正width和height
      let maxWidth = gapWidth - left;
      // top为0时的最大height
      let maxHeight = oppositeY - imgAreaData.top;

      // 图像的宽高比小于1
      if (left + width > shortSide + gapWidth) {
        left = shortSide + gapWidth - width;
        width = maxWidth;
      }
      if (top < 0) {
        top = 0;
        height = maxHeight;
      }
    } else if (WHRatio > 1) {
      // 用于修正width和height
      let maxWidth = imgAreaData.width - (oppositeX - imgAreaData.left);
      let maxHeight = oppositeY - gapWidth - imgAreaData.top;

      // 图像的宽高比大于1
      if (left + width > imgAreaData.width) {
        // 此处要注意顺序
        width = maxWidth;
        left = imgAreaData.width - width;
      }
      if (top < gapWidth) {
        top = gapWidth;
        height = maxHeight;
      }
    } else {
      // 用于修正width和height
      let maxWidth = imgAreaData.width - (oppositeX - imgAreaData.left);
      let maxHeight = oppositeY - gapWidth - imgAreaData.top;
      // 图像的宽高比等于1
      if (left + width > imgAreaData.width) {
        left = imgAreaData.width - maxWidth;
      }
      if (top < 0) {
        top = 0;
        height = maxHeight;
      }
    }

    if (width < 5 || height < 5) return;
    selectEle.style.width = width + "px";
    selectEle.style.height = height + "px";
    selectEle.style.left = left + "px";
    selectEle.style.top = top + "px";
    monitorSelectSize();
  }
})();

// 左下拖拽逻辑
(function () {
  // opposite是左下角的对角(即右上角)的坐标
  let startX, startY, oppositeX, oppositeY;
  let dragAble = false;
  // 监听整个文档鼠标左键松开事件,注意不能用onmouseup注册，那样会被后面的覆盖
  document.addEventListener("mouseup", removeDragLBFun);
  function removeDragLBFun() {
    dragAble = false;
    isFourAngleDrag = false;
    imgArea.removeEventListener("mousemove", dragLB);
  }

  // 左下
  selectAngleEles[2].onmousedown = (e) => {
    dragAble = true;
    startX = selectEle.getBoundingClientRect().left;
    startY = selectEle.getBoundingClientRect().top;
    // 对角坐标
    oppositeX =
      selectEle.getBoundingClientRect().left +
      selectEle.getBoundingClientRect().width;
    oppositeY = selectEle.getBoundingClientRect().top;

    imgArea.addEventListener("mousemove", dragLB);
    console.log("点击", e.clientX, startX);
  };
  // 左下角的监听事件
  function dragLB(e) {
    if (!dragAble) return;
    isFourAngleDrag = true;
    // 通过HTMLElement.style.top(left)属性设置值用于定位时是相对于父元素的
    let top = oppositeY - imgAreaData.top;
    let width = oppositeX - e.clientX;
    let height = e.clientY - oppositeY;
    let left = e.clientX - imgAreaData.left;
    // 限制拖拽框
    if (WHRatio < 1) {
      // 用于修正width和height
      let maxWidth = oppositeX - imgAreaData.left - gapWidth;
      let maxHeight = imgAreaData.top + imgAreaData.height - oppositeY;
      // 图像的宽高比小于1
      if (left < gapWidth) {
        left = gapWidth;
        width = maxWidth;
      }
      if (top + height > imgAreaData.height) {
        height = maxHeight;
        top = imgAreaData.height - height;
      }
    } else if (WHRatio > 1) {
      // 用于修正width和height
      let maxWidth = oppositeX - imgAreaData.left;
      let maxHeight = shortSide + gapWidth - (oppositeY - imgAreaData.top);
      // 图像的宽高比大于1
      if (left < 0) {
        left = 0;
        width = maxWidth;
      }
      if (top + height > shortSide + gapWidth) {
        height = maxHeight;
        top = shortSide + gapWidth - height;
      }
    } else {
      // 用于修正width
      let maxWidth = oppositeX - imgAreaData.left;
      let maxHeight = imgAreaData.top + imgAreaData.height - oppositeY;
      // 图像的宽高比等于1
      if (left < 0) {
        left = 0;
        width = maxWidth;
      }
      if (height > imgAreaData.top + imgAreaData.height - oppositeY) {
        height = maxHeight;
      }
    }
    if (width < 5 || height < 5) return;
    selectEle.style.left = left + "px";
    selectEle.style.top = top + "px";
    selectEle.style.width = width + "px";
    selectEle.style.height = height + "px";
    monitorSelectSize();
  }
})();

// 右下角拖拽逻辑
(function () {
  let startX, startY;
  let dragAble = false;

  // 监听整个文档鼠标左键松开事件
  document.addEventListener("mouseup", removeDragRBFun);
  function removeDragRBFun() {
    dragAble = false;
    isFourAngleDrag = false;
    imgArea.removeEventListener("mousemove", dragRB);
  }

  // 右下
  selectAngleEles[3].onmousedown = (e) => {
    dragAble = true;
    // 起始点左上角的坐标
    startX = selectEle.getBoundingClientRect().left;
    startY = selectEle.getBoundingClientRect().top;
    // 绑定监听事件
    imgArea.addEventListener("mousemove", dragRB);
  };
  // 右下角拖拽的主要处理逻辑
  function dragRB(e) {
    if (!dragAble) return;
    isFourAngleDrag = true;
    let width = e.clientX - startX;
    let height = e.clientY - startY;
    // 限制裁剪框的大小
    if (WHRatio < 1) {
      // 说明height为容器的高度
      if (height + startY > imgAreaData.height + imgAreaData.top) {
        height = imgAreaData.height + imgAreaData.top - startY;
      }
      if (width + startX > shortSide + gapWidth + imgAreaData.left) {
        width = shortSide + gapWidth + imgAreaData.left - startX;
      }
    } else if (WHRatio > 1) {
      // 说明weight为容器的宽度
      if (height + startY > shortSide + gapWidth + imgAreaData.top) {
        height = shortSide + gapWidth + imgAreaData.top - startY;
      }
      if (width + startX > imgAreaData.width + imgAreaData.left) {
        width = imgAreaData.width + imgAreaData.left - startX;
      }
    } else {
      // 图像宽高比为1
      if (height + startY > imgAreaData.height + imgAreaData.top) {
        height = imgAreaData.height + imgAreaData.top - startY;
      }
      if (width + startX > imgAreaData.width + imgAreaData.left) {
        width = imgAreaData.width + imgAreaData.left - startX;
      }
    }
    if (width < 5 || height < 5) return;
    selectEle.style.width = width + "px";
    selectEle.style.height = height + "px";
    monitorSelectSize();
  }
})();

// 通过canvas获得裁剪区域图像
function cropImage() {
  function drawCanvas(className) {
    // selectSize是随尺寸不断更新的裁剪区域的信息
    const cvs = document.querySelector(className);
    const ctx = cvs.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    // 画布大小设置和裁剪框大小一样
    // 调整像素比后图像会更清晰，但造成卡顿
    cvs.width = selectSize.sWidth * ratio;
    cvs.height = selectSize.sHeight * ratio;
    // cvs.width = selectSize.sWidth;
    // cvs.height = selectSize.sHeight;
    ctx.drawImage(
      previewEle,
      selectSize.x,
      selectSize.y,
      selectSize.sWidth,
      selectSize.sHeight,
      0,
      0,
      cvs.width,
      cvs.height
    );
  }
  drawCanvas('.avatar')
  drawCanvas('.selectCVS')
  // 后续做文件上传时会用到

  // cvs.toBlob((blob) => {
  //   const file = new File([blob], "avatar.png", {
  //     type: "image/png",
  //   });
  //   const reader = new FileReader();
  //   reader.onload = (e) => {
  //     // 将裁剪下的图片加入到avatar中展示
  //     // avatarEle.src = e.target.result;
  //     // console.log("最终裁剪的头像",e.target.result);
  //   };
  //   reader.readAsDataURL(file);
  // });
}
