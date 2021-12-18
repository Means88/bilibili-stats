// See: https://github.com/anuraghazra/github-readme-stats

import { BiliBiliStats } from "../data/bilibili";

export interface RenderOptions {
  colorPrimary?: string;
  colorText?: string;
}

const levelColors = [
  '#b7b7b7', // 0
  '#95d5ac', // 1
  '#95d5ac', // 2
  '#90c9df', // 3
  '#fbba72', // 4
  '#fb9a72', // 5
  '#fb7299' // 6
];

export const bilibiliCard = ({
  username,
  followers,
  followings,
  recentViews,
  level,
  videos,
  description,
}: BiliBiliStats, { colorPrimary = '#fb7299', colorText = '#333' }: RenderOptions = {}) => {
  const ringLength = 40 * 2 * Math.PI;
  const filledRingPercent = level / 6;
  const emptyRingPercent = 1 - filledRingPercent;

  return `
    <svg
      width="495"
      height="195"
      viewBox="0 0 495 195"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        .header {
          font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
          fill: ${colorPrimary};
          animation: fadeInAnimation 0.8s ease-in-out forwards;
        }
        @supports(-moz-appearance: auto) {
          /* Selector detects Firefox */
          .header { font-size: 15.5px; }
        }
.description {
  font: 500 12px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: ${colorText};
  opacity: 0.5;
}
  .stat {
    font: 600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: ${colorText};
  }
  @supports(-moz-appearance: auto) {
    /* Selector detects Firefox */
    .stat { font-size:12px; }
  }
  .stagger {
    opacity: 0;
    animation: fadeInAnimation 0.3s ease-in-out forwards;
  }
  .rank-text {
    font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colorText};
    animation: scaleInAnimation 0.3s ease-in-out forwards;
  }

  .bold { font-weight: 700 }
  .icon {
    fill: #4c71f2;
    display: none;
  }

  .rank-circle-rim {
    stroke: ${levelColors[level]};
    fill: none;
    stroke-width: 6;
    opacity: 0.2;
  }
  .rank-circle {
    stroke: ${levelColors[level]};
    fill: none;
    stroke-dasharray: ${ringLength};
    stroke-width: 6;
    stroke-linecap: round;
    opacity: 0.8;
    transform-origin: -10px 8px;
    transform: rotate(-90deg);
    animation: rankAnimation 1s forwards ease-in-out;
  }

  @keyframes rankAnimation {
    from {
      stroke-dashoffset: ${ringLength};
    }
    to {
      stroke-dashoffset: ${ringLength * emptyRingPercent};
    }
  }

  /* Animations */
  @keyframes scaleInAnimation {
    from {
      transform: translate(-5px, 5px) scale(0);
    }
    to {
      transform: translate(-5px, 5px) scale(1);
    }
  }
  @keyframes fadeInAnimation {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }


      </style>


      <rect
        data-testid="card-bg"
        x="0.5"
        y="0.5"
        rx="4.5"
        height="99%"
        stroke="#e4e2e2"
        width="494"
        stroke-opacity="1"
      />


    <g
      data-testid="card-title"
      transform="translate(22, 35)"
    >
      <g transform="translate(0, 0)">
      <path class="header" fill="${colorPrimary}" transform="scale(0.02) translate(0, -830)" d="M306.005333 117.632L444.330667 256h135.296l138.368-138.325333a42.666667 42.666667 0 0 1 60.373333 60.373333L700.330667 256H789.333333A149.333333 149.333333 0 0 1 938.666667 405.333333v341.333334a149.333333 149.333333 0 0 1-149.333334 149.333333h-554.666666A149.333333 149.333333 0 0 1 85.333333 746.666667v-341.333334A149.333333 149.333333 0 0 1 234.666667 256h88.96L245.632 177.962667a42.666667 42.666667 0 0 1 60.373333-60.373334zM789.333333 341.333333h-554.666666a64 64 0 0 0-63.701334 57.856L170.666667 405.333333v341.333334a64 64 0 0 0 57.856 63.701333L234.666667 810.666667h554.666666a64 64 0 0 0 63.701334-57.856L853.333333 746.666667v-341.333334A64 64 0 0 0 789.333333 341.333333zM341.333333 469.333333a42.666667 42.666667 0 0 1 42.666667 42.666667v85.333333a42.666667 42.666667 0 0 1-85.333333 0v-85.333333a42.666667 42.666667 0 0 1 42.666666-42.666667z m341.333334 0a42.666667 42.666667 0 0 1 42.666666 42.666667v85.333333a42.666667 42.666667 0 0 1-85.333333 0v-85.333333a42.666667 42.666667 0 0 1 42.666667-42.666667z" p-id="540"></path>
    <text
      x="0"
      y="0"
      class="header"
      data-testid="header"
      transform="translate(25, 0)"
    >${username}</text>
  </g>
    </g>

    <g transform="translate(0, 45)">
  <g class="stagger" style="animation-delay: 250ms" transform="translate(25, 0)">
    <text class="description"  y="12.5">${description}</text>
  </g>
</g>


      <g
        data-testid="main-card-body"
        transform="translate(0, 55)"
      >

  <g data-testid="rank-circle"
        transform="translate(400, 60)">
      <circle class="rank-circle-rim" cx="-10" cy="8" r="40" />
      <circle class="rank-circle" cx="-10" cy="8" r="40" />
      <g class="rank-text">
        <text
          x="-3"
          y="0"
          alignment-baseline="central"
          dominant-baseline="central"
          text-anchor="middle"
        >
          Lv.${level}
        </text>
      </g>
    </g>

  <svg x="0" y="0">

    <g transform="translate(0, 25)">
  <g class="stagger" style="animation-delay: 450ms" transform="translate(25, 0)">
    <text class="stat bold"  y="12.5">Followers:</text>
    <text
      class="stat"
      x="170"
      y="12.5"
      data-testid="stars"
    >${followers}</text>
  </g>
</g><g transform="translate(0, 50)">
  <g class="stagger" style="animation-delay: 600ms" transform="translate(25, 0)">

    <text class="stat bold"  y="12.5">Followings:</text>
    <text
      class="stat"
      x="170"
      y="12.5"
      data-testid="commits"
    >${followings}</text>
  </g>
</g>
<g transform="translate(0, 75)">
  <g class="stagger" style="animation-delay: 750ms" transform="translate(25, 0)">

    <text class="stat bold"  y="12.5">Total Videos:</text>
    <text
      class="stat"
      x="170"
      y="12.5"
      data-testid="issues"
    >${videos}</text>
  </g>
</g>
<g transform="translate(0, 100)">
  <g class="stagger" style="animation-delay: 900ms" transform="translate(25, 0)">

    <text class="stat bold"  y="12.5">Recent Views:</text>
    <text
      class="stat"
      x="170"
      y="12.5"
      data-testid="prs"
    >${recentViews}</text>
  </g>
</g>
  </svg>

      </g>
    </svg>
  `
}
