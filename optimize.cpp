#include <cstdio>
#include <cmath>

#define INF 1000000007

using namespace std;

double A (int K, int p0) {
  return (double)(K - p0) / (p0);
}

double f (double K, double k, int t, int p0) {
  return K / (1 + A(K, p0) * exp(-1 * k * t));
}

double err (double K, double k, int p0, int *xs, int *ys, int len, bool rel) {
  double e = 0;
  for (int i=0; i<len; i++) {
    e += pow(
      ((double)(ys[i]) - f(K, k, xs[i], p0)) /* ((double)xs[i]/7)*/ /
      (rel ? ys[i] : 1),
    2) / (rel ? len : 1);
  }
  return sqrt(e/len);
}

double dedK (double K, double k, int p0, int *xs, int *ys, int len, bool rel) {
  double acc = 0;
  for (int i=0; i<len; i++) {
    acc += ((double)(ys[i]) - f(K, k, xs[i], p0)) * (p0 + K) * (1 - exp(-1 * k * xs[i])) * (rel ? pow(ys[i], -2) : 1) /
      ((double)pow(p0, 2) + exp(-2 * k * xs[i]) * pow(K-p0, 2) - 2 * p0 * (K-p0) * exp(-1 * k * xs[i]) );
  }
  acc *= -2;
  return acc;
}

double dedk (double K, double k, int p0, int *xs, int *ys, int len, bool rel) {
  double acc = 0;
  for (int i=0; i<len; i++) {
    acc += ((double)(ys[i]) - f(K, k, xs[i], p0)) * K * xs[i] * A(K, p0) * exp(-1 * k * xs[i]) * (rel ? pow(ys[i], -2) : 1) /
      pow( 1 + A(K, p0) * exp(-1 * k * xs[i]), 2 );
  }
  acc *= -2;
  return acc;
}

double min (double x, double y) {
  if (x < y) return x;
  return y;
}

void optimize (int *xs, int *ys, int len, int p0, int pop, bool rel, char *state) {
  double minminee = INF, minminK, minmink;
  double eps = rel ? 0.001 : 1;
  for(double pctg=0.0001; pctg<0.25; pctg+=0.0001) {
    double K = pop * pctg / 100;
    double Kmax = K;
    double k = 0.15;

    double ee = err(K, k, p0, xs, ys, len, rel);
    int i = 0;
    double minee = INF, minK, mink;
    if (ee < minee) {
      minee = ee;
      minK = K;
      mink = k;
    }
    while (ee > eps && i < 1000) {
      double _K = K, _k = k;
      K = min(Kmax, _K - ee / dedK(_K, _k, p0, xs, ys, len, rel));
      if (K < 0) K = _K;
      k = _k - ee / dedk(_K, _k, p0, xs, ys, len, rel);
      ee = err(K, k, p0, xs, ys, len, rel);
      if (ee < minee) {
        minee = ee;
        minK = K;
        mink = k;
      }
      i++;
    }

    if (minee < minminee) {
      minminee = minee;
      minminK = minK;
      minmink = mink;
    }
  }

  printf("%s %f %f\n", state, minminK, minmink);
}

void optimizeSimpleOld (int *xs, int *ys, int len, int p0, int pop, bool rel, char *state) {
  double minee = INF, minK, mink;
  for(double pctg=0.0001; pctg<0.25; pctg+=0.0001) {
    double K = pop * pctg / 100;
    for (double k=0.001; k<1; k+=0.001) {
      double ee = err(K, k, p0, xs, ys, len, rel);
      if (ee < minee) {
        minee = ee;
        minK = K;
        mink = k;
      }
    }
  }

  printf("%s %f %f\n", state, minK, mink);
}

double optimizeSimple (int *xs, int *ys, int len, int p0, int pop, bool rel, char *state, double _l, double _u) {
  double minee = INF, minK, mink, minpctg, l, u, d;
  l = _l;
  u = _u;
  d = 0.1;
  double latest = ys[len-1];
  double diff = 0;
  if (len-2 >= 0) diff = ys[len-1]-ys[len-2];
  do {
    for(double pctg=l; pctg<=u; pctg+=d) {
      double K = pop * pctg / 100;
      if (K < latest+diff) continue;
      for (double k=0.001; k<1; k+=0.001) {
        double ee = err(K, k, p0, xs, ys, len, rel);
        if (ee < minee) {
          minee = ee;
          minK = K;
          mink = k;
          minpctg = pctg;
        }
      }
    }

    l = minpctg - d;
    u = minpctg + d;
    d /= 10;
  } while ((double)pop * d / 100 > 10);

  printf("%s %f %f\n", state, minK, mink);
  return minK;
}

int main () {
  int T, p0, pop, len, rel, xs[1000], ys[1000], x, y;
  char state[100];
  double K;
  scanf("%d\n", &T);
  while (T--) {
    scanf("%[^\n]", state);

    scanf("%d %d %d %d\n", &p0, &pop, &len, &rel);
    for (int i=0; i<len; i++) {
      scanf("%d %d\n", &x, &y);
      xs[i] = x;
      ys[i] = y;
    }
    K = optimizeSimple(xs, ys, len, p0, pop, false, state, 0.1, 1);

    scanf("%d %d\n", &p0, &len);
    for (int i=0; i<len; i++) {
      scanf("%d %d\n", &x, &y);
      xs[i] = x;
      ys[i] = y;
    }
    K -= optimizeSimple(xs, ys, len, p0, int(K), false, state, 0, 25);

    scanf("%d %d\n", &p0, &len);
    for (int i=0; i<len; i++) {
      scanf("%d %d\n", &x, &y);
      xs[i] = x;
      ys[i] = y;
    }
    optimizeSimple(xs, ys, len, p0, int(K), false, state, 100, 100);

    printf("---\n");
  }
  return 0;
}
