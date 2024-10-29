/* Code contributed by Tapani Utriainen */
/* compile with: gcc -Ofast perfratingsim.c -lm -o perfratingsim */

#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <math.h>
#include <time.h>

#define PLAYERS 12


/* ########################################################################## 
   X. Data, current ratings and win/loss data (no respect with pl1 or 2)
   ########################################################################## */

/*
	These arrays are to obey the invariants:
	wins[a][b] + wins[b][a] == nof_games[a][b] == nof_games[b][a]
*/

double approx_rating[PLAYERS]; /* This is to be calculated */
int nof_games[PLAYERS][PLAYERS]; /* How many games played (symmetric) */
int wins[PLAYERS][PLAYERS]; /* How many games first index player won */

/* ########################################################################## */


/* The following functions are to support simulation */

double strength[PLAYERS]; /* simulation : hidden value of "real" strength */

/* print player stats */
void print_player(int i) {
	int ws = 0, gs = 0;
	for (int j=0; j<PLAYERS; j++) ws += wins[i][j];
	for (int j=0; j<PLAYERS; j++) gs += nof_games[i][j];
	printf(" %5d | %7.1lf |   %8.1lf |%7d /%7d\n", i, strength[i], approx_rating[i], ws, gs);
}

/* -------------------------------------------------------------------------- */

 /* simulation : returns random number, uniformly between 0 and 1 */
double uniform_random(void) {
	return (double)((uint32_t)((rand() << 15) ^ rand()))*2.3283064370807974e-10;
}

/* -------------------------------------------------------------------------- */

/* simulation : random number, binomial distribution */
int binomial_random(double chance, int nof_tries) {
	int successes = 0;
	for (int i=0; i<nof_tries; i++) successes += uniform_random() < chance;
	return successes;
}

/* -------------------------------------------------------------------------- */

/* simulation : generates mock-up ratings */
void generate_ratings(void) {
	/* Player 0 is the anchor, always ar rating 0, add player 2 & 3 too */
	strength[0] = 0;
	strength[1] = 750;
	strength[2] = 1150;
	for (int i=3; i<PLAYERS; i++) strength[i] = 250 + 50*(rand()%12 + rand()%12 + rand()%12);
}

/* -------------------------------------------------------------------------- */

/* simulation : helper to add games and wins in one go*/
void addwins(int i, int j, int n) { 
	nof_games[i][j] += n;
	nof_games[j][i] += n;
	wins[i][j] += n;
}

/* -------------------------------------------------------------------------- */

/* ########################################################################## 
   0. Optimized version (2x speed) of pow(10.0, x), works when base is const
   ########################################################################## */

/* can be replaced with pow(10.0, x) */
inline double pow10(double x) {
	static const double ln10 = log(10.0);
	return exp(x * ln10);
}

/* ########################################################################## 
   1. Function for win probability based on rating difference
   ########################################################################## */

/* returns win probability for an elo rating difference */
double elo_win_prob(double rating_difference) {
	return 1.0 / (1.0 + pow10(-rating_difference/400.0));
}

/* ########################################################################## 
   2. Function for rating performance for a player           
   ########################################################################## */

double calculate_performance(int player) {
	/* use last estimate as initial guess for new estimate */
	double low = -1000, high = 4000, guessed_rating = approx_rating[player];

	/* binary search to find the most likely rating */
	while (high > low + 1.0) {
		double actual_score = 0, expected_score = 1e-5;
		for (int j=0; j<PLAYERS; j++) {
			if (j == player || !nof_games[player][j]) continue;
			double win_prob = elo_win_prob(guessed_rating - approx_rating[j]);
			expected_score += nof_games[player][j] * win_prob;
			actual_score += wins[player][j];
		}
		if (expected_score < actual_score) low = guessed_rating; else high = guessed_rating;	
		guessed_rating = 0.5*(low + high);
	}
	
	return high;
}

/* ########################################################################## 
   3. Procedure that updates all ratings
   ########################################################################## */

void calculate_ratings(void) {
	/* calulate an initial rating estimates from anchor player */
	for (int i=1; i<PLAYERS; i++) {
		if (nof_games[i][0] == 0) { approx_rating[i] = 1200; continue; }
		
		double win_rate = (double)wins[i][0] / nof_games[i][0];
		
		if (wins[i][0] == nof_games[i][0]) win_rate -= 1e-3;
		if (wins[i][0] == 0) win_rate = 1e-3;

		approx_rating[i] = -400*log10((1.0 - win_rate) / win_rate);
	}

	/* iterative procedure to update all ratings */
	double lastsum = -1e9, sum = 0;
	for (int iter=0; iter<100 && (lastsum + PLAYERS <= sum); iter++) {
		lastsum = sum; sum = 0;
		double new_approx_rating[PLAYERS]; /* Avoid mixing updated and unupdated ratings in calculation */
		for (int i=0; i<PLAYERS; i++) new_approx_rating[i] = calculate_performance(i);
		for (int i=0; i<PLAYERS; i++) approx_rating[i] = new_approx_rating[i] - new_approx_rating[0];
		for (int i=0; i<PLAYERS; i++) sum += approx_rating[i];
	}
}

/* ########################################################################## */


int main(void) {
	srand(time(0));

	generate_ratings();

	/* add default games between players 1,2 and 3 */	
	/* player1 vs player2 : 528-99472 */
	addwins(0, 1, 528);
	addwins(1, 0, 99472);

	/* player1 vs player3 : 320-99680 */
	addwins(0, 2, 320);
	addwins(2, 0, 99680);

	/* player2 vs player3 : 18727-81273 */
	addwins(1, 2, 18727);
	addwins(2, 1, 81273);

	calculate_ratings();

	/* play 10 round robins, and print approximation results */
	printf("PLAYING ROUND ROBIN : ");
	for (int r=0; r<10; r++) {
		printf("%d ", r); fflush(stdout);

		for (int i=0; i<PLAYERS; i++) {
			for (int j=0; j<PLAYERS; j++) {
				if (i == j) continue;
				double win_prob = elo_win_prob(strength[i] - strength[j]);
				win_prob += (win_prob - 0.5) * 0.003; /* randomness in outcomes */
				int w = binomial_random(win_prob, 2);
				addwins(i, j, w);
				addwins(j, i, 2-w);
			}
		}
		calculate_ratings();		
	}
	/* print results */
	printf("\nPLAYER |  ACTUAL | CALCULATED |   WINS /  GAMES\n");
	for (int i=0; i<PLAYERS; i++) print_player(i);

	return EXIT_SUCCESS;
}
