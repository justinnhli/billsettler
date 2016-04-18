// VARIABLES
var members = [];
var assets = {};
var liabilities = {};

// POINTERS
var lastMemberItem;
var lastDebtItem;

// CACHES
var memberSelector;

// TEMPS
var i, j, k;

// FUNCTIONS
var addDebtItem, addMemberItem, beautifyNumber, checkNumber, createMemberSelector, createMemberSelectorTemplate, debtItemUnused, decimalize, init, lastDebtItem, lastMemberItem, memberSelector, removeDebtItem, removeMemberItem, shouldAddDebtItem, updateDebts, updateMembers, updateResults;

// Things to do (in descending priority)
// TODO allow arbitrary debtors per line (instead of all or one)
// TODO provide stateful URL, ideally a subset of DOT
// TODO get rid of fancy showing/hiding of boxes (it's buggy anyway)
// TODO give visual indication of additional entry information (members, debts)
// TODO give rounding error leftovers to largest creditor as "interest"

// INIT

$(document).ready(function() {
	addMemberItem();
});

// MEMBER LIST

function addMemberItem() {
	lastMemberItem = $('<li><input class="member" type="text" onBlur="removeMemberItem(this);" onKeyUp="updateMembers(this);"></li>');
	$("#memberList").append(lastMemberItem);
}

function updateMembers() {
	if (lastMemberItem.children().attr("value") !== "") {
		addMemberItem();
	}
	members = [];
	assets = {};
	liabilities = {};
	$(".member").each(function () {
		if (this.value !== "") {
			assets[this.value] = 0;
			liabilities[this.value] = 0;
			members.push(this.value);
		}
	});
	memberSelector = createMemberSelectorTemplate();
	if (shouldAddDebtItem()) {
		addDebtItem();
	}
	if ($("#debtList").children().length > 0) {
		$(".memberSelect").each(function () {
			var select, className, newSelect;
			select = $(this);
			if (select.attr("value") !== "0" && assets[select.attr("value")] === undefined) {
				select.parent().detach();
			} else {
				className = select.hasClass("debtor") ? "debtor" : "creditor";
				newSelect = $(createMemberSelector(className));
				newSelect.val(select.attr("value"));
				if (className === "creditor") {
					newSelect.find("[value=0]").detach();
				}
				select.replaceWith(newSelect);
			}
		});
	}
	updateDebts();
}

function removeMemberItem(input) {
	input = $(input);
	if (input.parent().not(lastMemberItem).length !== 0 && input.attr("value") === "") {
		input.parent().detach();
	}
	updateMembers();
}

// DEBT LIST

function addDebtItem() {
	var debtor, creditor;
	debtor = createMemberSelector("debtor");
	creditor = createMemberSelector("creditor");
	lastDebtItem = $('<li class="debt">' + creditor + ' paid $<input class="amount" type="text" onBlur="this.value = beautifyNumber(this.value); removeDebtItem(this);" onKeyUp="checkNumber(this); updateDebts(this);" value="0.00"> to buy <input class="comment" type="text"> for ' + debtor + '</li>');
	lastDebtItem.find(".creditor > [value=0]").detach();
	$("#debtList").append(lastDebtItem);
	$("#debtTitle").css("display", "block");
	$("#debtCell").css("border", "1px #000000 solid");
}

function updateDebts() {
	if (shouldAddDebtItem()) {
		addDebtItem();
	}
	var dot, creditor, debtor, matrix = {}, name1, name2;
	for (debtor in assets) {
		assets[debtor] = 0;
		liabilities[debtor] = 0;
		matrix[debtor] = {};
		for (creditor in assets) {
			matrix[debtor][creditor] = 0;
		}
	}
	dot = $("#dot").empty().append("digraph {\n");
	$(".debt").each(function () {
		var li, debtor, creditor, amount, share;
		li = $(this);
		if (!debtItemUnused(li)) {
			// TODO modify to check checkboxes/multi-select lists
			debtor = li.children(".debtor").attr("value");
			creditor = li.children(".creditor").attr("value");
			amount = 100 * Number(li.children(".amount").attr("value"));
			if (amount > 0) {
				if (debtor === "0") {
					share = amount / members.length;
					for (debtor in matrix) {
						matrix[debtor][creditor] += share;
						if (debtor !== creditor) {
							dot.append("&nbsp;&nbsp;&nbsp;&nbsp;\"" + creditor + "\" -> \"" + debtor + "\" [label=\"$" + decimalize(share) + "\"]\n");
						}
					}
				} else {
					matrix[debtor][creditor] += amount;
					if (debtor !== creditor) {
						dot.append("&nbsp;&nbsp;&nbsp;&nbsp;\"" + creditor + "\" -> \"" + debtor + "\" [label=\"" + decimalize(amount) + "\"]\n");
					}
				}
			}
		}
	});
	dot.append("}");
	for (name1 in matrix) {
		assets[name1] = 0;
		liabilities[name1] = 0;
		for (name2 in matrix) {
			assets[name1] += matrix[name2][name1];
			liabilities[name1] += matrix[name1][name2];
		}
		assets[name1] = Math.round(assets[name1]);
		liabilities[name1] = Math.round(liabilities[name1]);
	}
	updateResults();
}

function removeDebtItem(input) {
	input = $(input);
	if (input.parent().not(lastDebtItem).length !== 0 && Number(input.attr("value")) === 0) {
		input.parent().detach();
	}
	updateDebts();
}

function debtItemUnused(debtItem) {
	return debtItem.children(".debtor").attr("value") === "0" &&
		debtItem.children(".creditor").attr("value") === members[0] &&
		Number(debtItem.children(".amount").attr("value")) === 0 &&
		debtItem.children(".comment").attr("value") === "";
}

function shouldAddDebtItem() {
	return members.length > 1 && ($("#debtList").children().length === 0 || !debtItemUnused(lastDebtItem));
}

function createMemberSelector(className) {
	var memberSelect = $(memberSelector);
	memberSelect.children().addClass(className);
	return memberSelect.html();
}

function createMemberSelectorTemplate() {
	var html, i;
	html = '<div class="memberSelectWrapper"><select class="memberSelect" onChange="updateDebts();">';
	html += '<option value="0">Everyone</option>';
	for (i = 0; i < members.length; i += 1) {
		html += '<option value="' + members[i] + '">' + members[i] + '</option>';
	}
	html += '</select></div>';
	return html;
}

function updateResults() {
	var creditor, debt, debts, debtor, display, name, names = [], resultHeader, resultList, results, resultTable;

	/*
		This algorithm works thus. First, we calculate how much each person
		owes, by subtracting their assets from their liabilities.  This is
		all put into a list and sorted, giving us a deque with access to
		the person who owes the most and the person who is owed the most.
		Since we want to minimize the number of payments, we take the people
		who owe the most and have them pay off the people who are owed the
		most. At each step, either the debtor repays his entire debt or the
		creditor gets all his money back; this algorithm therefore guarantees
		that all debts will be settled with at most n transactions.
		*/

	debt = 0;
	debts = {};
	display = false;
	for (name in assets) {
		debts[name] = liabilities[name] - assets[name];
		display = display || (liabilities[name] !== 0);
		names.push(name);
	}

	resultHeader = $("#resultHeader");
	resultTable = $("#resultTable").empty().append(resultHeader);
	if (display) {
		$("#resultCell").css("display", "table-cell");
	}
	names.sort();
	for (i = 0; i < names.length; i += 1) {
		name = names[i];
		resultTable.append('<tr><td>' + name + '</td><td>' + decimalize(assets[name]) + '</td><td>' + decimalize(liabilities[name]) + '</td><td>' + decimalize(debts[name]) + '</td></tr>');
		debt += debts[name];
	}
	resultTable.append('<tr><td></td><td></td><td></td><td>Remainder:&nbsp;&nbsp;&nbsp;' + decimalize(debt) + '</td></tr>');

	names.sort(function (a, b) {
		return debts[a] - debts[b];
	});
	i = 0;
	j = names.length - 1;
	results = [];
	while (i < j) {
		creditor = names[i];
		while (i < j && debts[creditor] < 0) {
			debtor = names[j];
			debt = Math.min(debts[debtor], -debts[creditor]);
			debts[creditor] += debt;
			debts[debtor] -= debt;
			results.push("<li>" + debtor + " owes " + creditor + " $" + decimalize(debt) + "</li>");
			if (debts[debtor] <= 0) {
				j -= 1;
			}
		}
		i += 1;
	}

	resultList = $("#resultList").empty();
	results.sort();
	for (i = 0; i < results.length; i += 1) {
		resultList.append(results[i]);
	}
	if (results.length === 0) {
		resultList.append($("<li>No one owes anyone anything</li>"));
	}
}

// DOT

function toggleDot() {
	var dot = $("#dot");
	if (dot.css("display") === "none") {
		dot.css("display", "block");
		$("#dotToggle").css("color", "#EEEEEC");
	} else {
		dot.css("display", "none");
		$("#dotToggle").css("color", "#555753");
	}
}

// MISCELLANEOUS

function beautifyNumber(str) {
	str = String(str);
	if (str === "") {
		str = "0.00";
	} else if (str.indexOf(".") === -1) {
		str += ".00";
	} else if (str.search(/\.[0-9]*[1-9]/) !== -1) {
		num = Math.round(100 * Number(str.substring(str.indexOf("."))));
		if (num < 10) {
			num = "0" + num;
		}
		str = str.replace(/\..*/, "." + num);
	} else {
		str = str.replace(/\..*/, ".00");
	}
	return str;
}

function checkNumber(input) {
	var value = input.value, point;
	value = value.replace(/[^0-9.]/g, "");
	point = value.indexOf(".");
	if (point !== -1 && point !== value.lastIndexOf(".")) {
		value = value.substring(0, value.lastIndexOf("."));
	}
	if (value.search(/[1-9][0-9]*\./) !== -1) {
		value = value.replace(/^0*/, "");
	}
	input.value = value;
}

function decimalize(x) {
	if (Math.abs(x) < 100) {
		x = String(x).replace(/^(-?)/, "$100");
	}
	return String(x).replace(/(..)$/, ".$1");
}
